import * as THREE from "three";
import {
  DEFAULT_FIELD_PARAMS,
  generateTowerConfigs,
  type FieldParams,
} from "../config/towers";
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
  private params: FieldParams;
  private frozen = false;

  constructor(tileRadius = 2, params: FieldParams = DEFAULT_FIELD_PARAMS) {
    this.radius = tileRadius;
    this.params = { ...params, colors: [...params.colors] };
    this.object = new THREE.Group();
    this.build();
  }

  private build(): void {
    // Prototype tile: all configured towers built once.
    const prototype = new THREE.Group();
    for (const config of generateTowerConfigs(this.params)) {
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
    this.object.updateMatrixWorld(true);
  }

  /**
   * Freeze/unfreeze tile recentring. While frozen the grid stops following the
   * camera, so a tower instance the menu is anchored to can't be recycled out
   * from under it mid-interaction.
   */
  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
  }

  rebuild(params: FieldParams): void {
    this.params = { ...params, colors: [...params.colors] };
    this.disposeContents();
    this.logicalHotspots.length = 0;
    this.hotspotMeshes.length = 0;
    this.build();
  }

  private disposeContents(): void {
    // Remove tiles from the scene before disposing GPU resources. Clones share
    // geometry/materials with the prototype — disposing while still in-scene
    // leaves every tile with dead buffers.
    this.tiles.forEach((tile) => this.object.remove(tile));
    this.tiles.length = 0;
    this.towers.forEach((t) => t.dispose());
    this.towers.length = 0;
  }

  /** Recentre the tile grid on the camera so the field appears endless. */
  update(cameraX: number, cameraZ: number): void {
    if (this.frozen) return;
    const cx = Math.round(cameraX / this.params.tileSize);
    const cz = Math.round(cameraZ / this.params.tileSize);

    let t = 0;
    for (let i = -this.radius; i <= this.radius; i++) {
      for (let j = -this.radius; j <= this.radius; j++) {
        this.tiles[t++].position.set(
          (cx + i) * this.params.tileSize,
          0,
          (cz + j) * this.params.tileSize,
        );
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
    this.disposeContents();
  }
}
