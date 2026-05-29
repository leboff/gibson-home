import * as THREE from "three";
import { TILE_SIZE, TOWERS } from "../config/towers";
import type { Hotspot } from "../types";
import { Tower, type HotspotUserData } from "./Tower";

/** A unique hotspot from the config plus the tower it lives on. */
export interface LogicalHotspot {
  hotspot: Hotspot;
  towerId: string;
  towerLabel: string;
}

/**
 * Builds the tower field and tiles it across the ground plane so it loops in
 * any horizontal direction.
 *
 * One prototype tile (all configured towers) is built once, then cloned into a
 * (2r+1) x (2r+1) grid of tiles. Clones share geometry + materials by
 * reference. Each frame the tile grid is recentred on the camera, so the player
 * can travel forever on X and Z with the layout recurring — the fog hides the
 * recycle boundary.
 */
export class TowerField {
  readonly object: THREE.Group;
  readonly logicalHotspots: LogicalHotspot[] = [];
  readonly hotspotMeshes: THREE.Mesh[] = [];

  private readonly towers: Tower[] = [];
  private readonly tiles: THREE.Group[] = [];
  private readonly radius: number;
  private frozen = false;

  constructor(tileRadius = 2) {
    this.radius = tileRadius;
    this.object = new THREE.Group();

    // Prototype tile: all configured towers built once.
    const prototype = new THREE.Group();
    for (const config of TOWERS) {
      const tower = new Tower(config);
      this.towers.push(tower);
      prototype.add(tower.object);

      for (const h of config.hotspots ?? []) {
        this.logicalHotspots.push({
          hotspot: h,
          towerId: config.id,
          towerLabel: config.label,
        });
      }
    }

    // Clone the prototype into the tile grid.
    for (let i = -this.radius; i <= this.radius; i++) {
      for (let j = -this.radius; j <= this.radius; j++) {
        const tile = i === 0 && j === 0 ? prototype : prototype.clone(true);
        this.tiles.push(tile);
        this.object.add(tile);

        tile.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            const data = obj.userData as Partial<HotspotUserData>;
            if (data.kind === "hotspot") this.hotspotMeshes.push(obj);
          }
        });
      }
    }
  }

  /**
   * Freeze/unfreeze tile recentring. While frozen the grid stops following the
   * camera, so a tower instance the menu is anchored to can't be recycled out
   * from under it mid-interaction.
   */
  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
  }

  /** Recentre the tile grid on the camera so the field appears endless. */
  update(cameraX: number, cameraZ: number): void {
    if (this.frozen) return;
    const cx = Math.round(cameraX / TILE_SIZE);
    const cz = Math.round(cameraZ / TILE_SIZE);

    let t = 0;
    for (let i = -this.radius; i <= this.radius; i++) {
      for (let j = -this.radius; j <= this.radius; j++) {
        this.tiles[t++].position.set((cx + i) * TILE_SIZE, 0, (cz + j) * TILE_SIZE);
      }
    }
    this.object.updateMatrixWorld(true);
  }

  /** Nearest live mesh instance of a given logical hotspot to a point. */
  nearestHotspotMesh(hotspotId: string, from: THREE.Vector3): THREE.Mesh | null {
    let best: THREE.Mesh | null = null;
    let bestDist = Infinity;
    const world = new THREE.Vector3();
    for (const mesh of this.hotspotMeshes) {
      const data = mesh.userData as HotspotUserData;
      if (data.hotspot.id !== hotspotId) continue;
      mesh.getWorldPosition(world);
      const d = world.distanceToSquared(from);
      if (d < bestDist) {
        bestDist = d;
        best = mesh;
      }
    }
    return best;
  }

  dispose(): void {
    this.towers.forEach((t) => t.dispose());
  }
}
