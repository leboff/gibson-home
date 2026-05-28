import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Face, Hotspot, TowerConfig } from "../types";
import { makeEdgeMaterial, makeNeonMaterial, resolveColor } from "./materials";

export interface HotspotUserData {
  kind: "hotspot";
  hotspot: Hotspot;
  towerId: string;
  towerLabel: string;
  baseEmissive: number;
}

/**
 * Builds one stacked-block tower: merged neon block faces, glowing wireframe
 * edges, and small emissive hotspot panels mounted on tower faces.
 *
 * Block geometry/edges are merged per tower (one draw call each); hotspot
 * panels stay separate because they're interactive raycast targets.
 */
export class Tower {
  readonly object: THREE.Group;
  readonly hotspotMeshes: THREE.Mesh[] = [];
  readonly totalHeight: number;

  private readonly geometries: THREE.BufferGeometry[] = [];

  constructor(config: TowerConfig) {
    this.object = new THREE.Group();
    this.object.name = `tower:${config.id}`;

    this.totalHeight = config.blocks.reduce((sum, b) => sum + b.height, 0);

    const blockGeoms: THREE.BufferGeometry[] = [];
    const edgeGeoms: THREE.BufferGeometry[] = [];

    let y = 0;
    for (const block of config.blocks) {
      const geo = new THREE.BoxGeometry(block.width, block.height, block.depth);
      geo.translate(0, y + block.height / 2, 0);
      blockGeoms.push(geo);

      const edges = new THREE.EdgesGeometry(geo);
      edgeGeoms.push(edges);

      y += block.height;
    }

    const mergedBlocks = mergeGeometries(blockGeoms, false);
    blockGeoms.forEach((g) => g.dispose());
    const bodyMesh = new THREE.Mesh(mergedBlocks, makeNeonMaterial(config.colorKey));
    this.geometries.push(mergedBlocks);
    this.object.add(bodyMesh);

    const mergedEdges = mergeGeometries(edgeGeoms, false);
    edgeGeoms.forEach((g) => g.dispose());
    const edgeMesh = new THREE.LineSegments(
      mergedEdges,
      makeEdgeMaterial(config.colorKey),
    );
    this.geometries.push(mergedEdges);
    this.object.add(edgeMesh);

    // Hotspot panels
    for (const hotspot of config.hotspots ?? []) {
      this.object.add(this.buildHotspot(config, hotspot));
    }

    this.object.position.set(config.position[0], 0, config.position[1]);
  }

  private buildHotspot(config: TowerConfig, hotspot: Hotspot): THREE.Mesh {
    const targetY = this.totalHeight * THREE.MathUtils.clamp(hotspot.heightFraction, 0, 1);
    const { width, depth } = this.footprintAt(config, targetY);

    const face: Face = hotspot.face ?? "s";
    const panelW = Math.max(2, Math.min(width, depth) * 0.7);
    const panelH = panelW;
    const baseEmissive = 0.9;

    const accent = hotspot.accentColor ?? config.colorKey;
    const geo = new THREE.PlaneGeometry(panelW, panelH);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x05010a,
      emissive: resolveColor(accent),
      emissiveIntensity: baseEmissive,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);

    const eps = 0.15;
    switch (face) {
      case "s":
        mesh.position.set(0, targetY, depth / 2 + eps);
        break;
      case "n":
        mesh.position.set(0, targetY, -depth / 2 - eps);
        mesh.rotation.y = Math.PI;
        break;
      case "e":
        mesh.position.set(width / 2 + eps, targetY, 0);
        mesh.rotation.y = Math.PI / 2;
        break;
      case "w":
        mesh.position.set(-width / 2 - eps, targetY, 0);
        mesh.rotation.y = -Math.PI / 2;
        break;
    }

    const data: HotspotUserData = {
      kind: "hotspot",
      hotspot,
      towerId: config.id,
      towerLabel: config.label,
      baseEmissive,
    };
    mesh.userData = data;
    mesh.name = `hotspot:${config.id}:${hotspot.id}`;
    this.hotspotMeshes.push(mesh);
    this.geometries.push(geo);
    return mesh;
  }

  /** Footprint (width/depth) of whichever block contains the given height. */
  private footprintAt(config: TowerConfig, height: number): { width: number; depth: number } {
    let y = 0;
    for (const block of config.blocks) {
      if (height <= y + block.height) return { width: block.width, depth: block.depth };
      y += block.height;
    }
    const last = config.blocks[config.blocks.length - 1];
    return { width: last.width, depth: last.depth };
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.hotspotMeshes.forEach((m) => (m.material as THREE.Material).dispose());
  }
}
