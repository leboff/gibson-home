import * as THREE from "three";
import type { Face, Hotspot, TowerConfig } from "../types";
import { makeEdgeMaterial, makeNeonMaterial, resolveColor } from "./materials";

const DATA_TEXTURE_WIDTH = 512;
const DATA_TEXTURE_HEIGHT = 1024;
const LABEL_TEXTURE_WIDTH = 512;
const LABEL_TEXTURE_HEIGHT = 144;
const DATA_GLYPHS = "01ABCDEF:/[]{}<>_-";
const DATA_CORPUS = [
  "GIBSON KERNEL ROOT TRACE LOGIN SYS NODE DAEMON",
  "ACCESS VECTOR MEMORY MAP ROUTE SOCKET PACKET",
  "MAINFRAME USER AUTH TOKEN PORT SHELL PROCESS",
  "BOOT SECTOR CACHE STACK HEAP CRYPTO CYPHER",
  "EXEC FORK PIPE IRQ BUS GPU RENDER GRID SCAN",
  "LOGIN ROOT SYSOP TERMINAL SESSION NETWORK",
  "DATASTREAM ADDRESS POINTER BUFFER REGISTER",
];

export interface HotspotUserData {
  kind: "hotspot";
  hotspot: Hotspot;
  towerId: string;
  towerLabel: string;
  baseEmissive: number;
}

/**
 * Builds one Gibson-style tower: a uniform translucent slab, glowing wireframe
 * edges, vertical data textures, and emissive hotspot panels mounted on faces.
 *
 * The configured blocks still drive height and footprint, but the visible
 * silhouette is intentionally not tiered.
 */
export class Tower {
  readonly object: THREE.Group;
  readonly hotspotMeshes: THREE.Mesh[] = [];
  readonly totalHeight: number;

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly textures: THREE.Texture[] = [];

  constructor(config: TowerConfig) {
    this.object = new THREE.Group();
    this.object.name = `tower:${config.id}`;

    this.totalHeight = config.blocks.reduce((sum, b) => sum + b.height, 0);
    const footprint = this.footprintAt(config, this.totalHeight);

    const bodyGeo = new THREE.BoxGeometry(
      footprint.width,
      this.totalHeight,
      footprint.depth,
    );
    bodyGeo.translate(0, this.totalHeight / 2, 0);
    const bodyMesh = new THREE.Mesh(bodyGeo, makeNeonMaterial(config.colorKey));
    bodyMesh.renderOrder = 1;
    this.geometries.push(bodyGeo);
    this.object.add(bodyMesh);

    const edgeGeo = new THREE.EdgesGeometry(bodyGeo);
    const edgeMesh = new THREE.LineSegments(
      edgeGeo,
      makeEdgeMaterial(config.colorKey),
    );
    this.geometries.push(edgeGeo);
    this.object.add(edgeMesh);

    this.addDataSides(config, footprint);

    // Hotspot panels
    for (const hotspot of config.hotspots ?? []) {
      this.object.add(this.buildHotspot(config, hotspot));
    }

    this.object.position.set(config.position[0], 0, config.position[1]);
  }

  private addDataSides(
    config: TowerConfig,
    footprint: { width: number; depth: number },
  ): void {
    const { texture, material } = this.createDataMaterial(config);
    this.textures.push(texture);
    this.materials.push(material);

    const eps = 0.08;
    const faces: Array<{
      geo: THREE.PlaneGeometry;
      x: number;
      z: number;
      rotationY: number;
    }> = [
      {
        geo: new THREE.PlaneGeometry(footprint.width, this.totalHeight),
        x: 0,
        z: footprint.depth / 2 + eps,
        rotationY: 0,
      },
      {
        geo: new THREE.PlaneGeometry(footprint.width, this.totalHeight),
        x: 0,
        z: -footprint.depth / 2 - eps,
        rotationY: Math.PI,
      },
      {
        geo: new THREE.PlaneGeometry(footprint.depth, this.totalHeight),
        x: footprint.width / 2 + eps,
        z: 0,
        rotationY: Math.PI / 2,
      },
      {
        geo: new THREE.PlaneGeometry(footprint.depth, this.totalHeight),
        x: -footprint.width / 2 - eps,
        z: 0,
        rotationY: -Math.PI / 2,
      },
    ];

    for (const face of faces) {
      face.geo.translate(0, this.totalHeight / 2, 0);
      const mesh = new THREE.Mesh(face.geo, material);
      mesh.position.set(face.x, 0, face.z);
      mesh.rotation.y = face.rotationY;
      mesh.renderOrder = 2;
      this.geometries.push(face.geo);
      this.object.add(mesh);
    }
  }

  private createDataMaterial(config: TowerConfig): {
    texture: THREE.CanvasTexture;
    material: THREE.MeshBasicMaterial;
  } {
    const canvas = document.createElement("canvas");
    canvas.width = DATA_TEXTURE_WIDTH;
    canvas.height = DATA_TEXTURE_HEIGHT;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create tower data texture");

    const color = resolveColor(config.colorKey);
    const seed = this.hash(config.id);
    const random = this.seededRandom(seed);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "12px monospace";
    ctx.textBaseline = "top";

    for (let y = 6; y < canvas.height; y += 13 + Math.floor(random() * 5)) {
      let x = -Math.floor(random() * 36);
      while (x < canvas.width) {
        const text = this.randomDataRun(random, 8 + Math.floor(random() * 18));

        ctx.fillStyle = `rgba(${Math.round(color.r * 255)}, ${Math.round(
          color.g * 255,
        )}, ${Math.round(color.b * 255)}, ${0.4 + random() * 0.42})`;
        ctx.fillText(text, x, y);

        x += ctx.measureText(text).width + 5 + Math.floor(random() * 9);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, Math.max(1, this.totalHeight / 32));
    texture.anisotropy = 4;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    return { texture, material };
  }

  private randomDataRun(random: () => number, targetLength: number): string {
    let text = DATA_CORPUS[Math.floor(random() * DATA_CORPUS.length)].slice(0, 2);
    while (text.length < targetLength) {
      const gram = text.slice(-2);
      const next = this.nextNGramChar(gram, random);
      text += random() > 0.9 ? DATA_GLYPHS[Math.floor(random() * DATA_GLYPHS.length)] : next;
    }
    return text.replace(/\s+/g, " ").slice(0, targetLength).trim();
  }

  private nextNGramChar(gram: string, random: () => number): string {
    const candidates: string[] = [];
    for (const sample of DATA_CORPUS) {
      for (let i = 0; i < sample.length - 2; i++) {
        if (sample.slice(i, i + 2) === gram) candidates.push(sample[i + 2]);
      }
    }
    if (candidates.length === 0) {
      return DATA_CORPUS[Math.floor(random() * DATA_CORPUS.length)][0];
    }
    return candidates[Math.floor(random() * candidates.length)];
  }

  private hash(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  private seededRandom(seed: number): () => number {
    let state = seed || 1;
    return () => {
      state = Math.imul(1664525, state) + 1013904223;
      return ((state >>> 0) / 4294967296);
    };
  }

  private buildHotspot(config: TowerConfig, hotspot: Hotspot): THREE.Mesh {
    const targetY = this.totalHeight * THREE.MathUtils.clamp(hotspot.heightFraction, 0, 1);
    const { width, depth } = this.footprintAt(config, targetY);

    const face: Face = hotspot.face ?? "s";
    const baseEmissive = 0.9;
    const accent = hotspot.accentColor ?? config.colorKey;

    // Glowing title text printed flush on the tower face (the clickable
    // hotspot). The expanded Hackers-style menu is presented separately.
    const faceWidth = face === "e" || face === "w" ? depth : width;
    const panelW = faceWidth * 0.46;
    const panelH = panelW * (LABEL_TEXTURE_HEIGHT / LABEL_TEXTURE_WIDTH);

    const texture = this.createHotspotLabel(hotspot.link.title, accent);
    this.textures.push(texture);

    const geo = new THREE.PlaneGeometry(panelW, panelH);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      map: texture,
      emissive: 0xffffff,
      emissiveMap: texture,
      emissiveIntensity: baseEmissive,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 3;

    // Sit the text just off the slab surface so it reads as printed on it.
    const eps = 0.12;
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

  /** Draws a neon menu-item label ("TITLE ▶") on a transparent canvas. */
  private createHotspotLabel(title: string, accentKey: string): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = LABEL_TEXTURE_WIDTH;
    canvas.height = LABEL_TEXTURE_HEIGHT;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create hotspot label texture");

    const color = resolveColor(accentKey);
    const css = `rgb(${Math.round(color.r * 255)}, ${Math.round(
      color.g * 255,
    )}, ${Math.round(color.b * 255)})`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = "middle";
    ctx.fillStyle = css;
    ctx.strokeStyle = css;
    ctx.shadowColor = css;
    ctx.shadowBlur = 18;

    const midY = canvas.height / 2;
    const arrowW = 46;
    const arrowX = canvas.width - 70;
    const textX = 30;
    const maxTextWidth = arrowX - textX - 30;

    const text = title.toUpperCase();
    let fontSize = 86;
    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    while (ctx.measureText(text).width > maxTextWidth && fontSize > 24) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    }
    ctx.fillText(text, textX, midY);

    ctx.beginPath();
    ctx.moveTo(arrowX, midY - 28);
    ctx.lineTo(arrowX + arrowW, midY);
    ctx.lineTo(arrowX, midY + 28);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
  }

  /** Uniform Gibson slabs use the largest configured footprint for every height. */
  private footprintAt(config: TowerConfig, _height: number): { width: number; depth: number } {
    return config.blocks.reduce(
      (max, block) => ({
        width: Math.max(max.width, block.width),
        depth: Math.max(max.depth, block.depth),
      }),
      { width: 0, depth: 0 },
    );
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.textures.forEach((t) => t.dispose());
    this.materials.forEach((m) => m.dispose());
    this.hotspotMeshes.forEach((m) => (m.material as THREE.Material).dispose());
  }
}
