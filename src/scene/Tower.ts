import * as THREE from "three";
import type { Face, Hotspot, TowerConfig } from "../types";
import { makeEdgeMaterial, makeNeonMaterial, resolveColor } from "./materials";

const DATA_TEXTURE_WIDTH = 512;
const DATA_TEXTURE_HEIGHT = 1024;
const LABEL_TEXTURE_WIDTH = 512;
const LABEL_TEXTURE_HEIGHT = 144;
// Vocabulary lifted from the Gibson tower faces in the film plates: short
// status-report fragments stacked into dense ledger columns.
const DATA_WORDS = [
  "REPORT", "CONFORM", "INITIATE", "OVERRIDE", "STATUS", "NOMINAL",
  "IDEOLOGUE", "ACCESS", "SECTOR", "TRACE", "RECORD", "SIGNAL", "DECODE",
  "MATRIX", "KERNEL", "ROUTE", "CIPHER", "UPLINK", "QUERY", "INDEX",
  "MEMO", "FILE", "NODE", "GRID", "SCAN", "LOGIN", "ROOT", "DAEMON",
  "SOCKET", "BUFFER", "VECTOR", "TOKEN", "SHELL", "UNIT", "TEST", "DOF",
  "GUE", "TC", "ML", "SYS", "REGIS", "PORT",
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

  // Live data-face animation: a slow downward stream plus a soft flicker.
  private dataTexture: THREE.CanvasTexture | null = null;
  private dataMaterial: THREE.MeshBasicMaterial | null = null;
  private scrollSpeed = 0;
  private flickerPhase = 0;
  private time = 0;

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
    this.dataTexture = texture;
    this.dataMaterial = material;
    const random = this.seededRandom(this.hash(`${config.id}:anim`));
    this.scrollSpeed = 0.004 + random() * 0.01;
    this.flickerPhase = random() * Math.PI * 2;

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
    const random = this.seededRandom(this.hash(config.id));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = "top";

    // The plates read as 2-3 narrow ledger columns per face, each packed with
    // short report fragments, dotted-block rows, and solid bars.
    const columnCount = 2 + Math.floor(random() * 2);
    const gutter = 14;
    const columnWidth = (canvas.width - gutter * (columnCount + 1)) / columnCount;

    for (let c = 0; c < columnCount; c++) {
      const x0 = gutter + c * (columnWidth + gutter);
      let y = Math.floor(random() * 24);
      while (y < canvas.height - 8) {
        const roll = random();
        if (roll < 0.08) {
          // Paragraph break.
          y += 14 + Math.floor(random() * 22);
        } else if (roll < 0.16) {
          this.drawDotBlockRow(ctx, random, color, x0, y, columnWidth);
          y += 14;
        } else if (roll < 0.22) {
          this.drawBarRow(ctx, random, color, x0, y, columnWidth);
          y += 16;
        } else {
          this.drawTextRow(ctx, random, color, x0, y, columnWidth);
          y += 13;
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, Math.max(1, this.totalHeight / 30));
    texture.anisotropy = 4;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    return { texture, material };
  }

  /** Picks the film palette per row: mostly tinted white, occasional amber. */
  private rowStyle(random: () => number, color: THREE.Color): string {
    const roll = random();
    if (roll < 0.07) {
      // Amber accent rows, like the orange ledger blocks in the plates.
      return `rgba(255, 176, 64, ${0.75 + random() * 0.25})`;
    }
    // Tower tint lifted toward white so the text reads as hot data.
    const lift = roll < 0.22 ? 0.7 : 0.3;
    const r = Math.round((color.r + (1 - color.r) * lift) * 255);
    const g = Math.round((color.g + (1 - color.g) * lift) * 255);
    const b = Math.round((color.b + (1 - color.b) * lift) * 255);
    return `rgba(${r}, ${g}, ${b}, ${0.4 + random() * 0.45})`;
  }

  /** One ledger line: indent + 1-3 short fragments (words / figures). */
  private drawTextRow(
    ctx: CanvasRenderingContext2D,
    random: () => number,
    color: THREE.Color,
    x0: number,
    y: number,
    width: number,
  ): void {
    ctx.font = `${random() < 0.2 ? "bold " : ""}11px monospace`;
    ctx.fillStyle = this.rowStyle(random, color);
    let x = x0 + (random() < 0.35 ? 10 + Math.floor(random() * 26) : 0);
    const parts = 1 + Math.floor(random() * 3);
    for (let i = 0; i < parts && x < x0 + width - 18; i++) {
      const text = this.dataFragment(random);
      ctx.fillText(text, x, y, x0 + width - x);
      x += ctx.measureText(text).width + 8 + Math.floor(random() * 10);
    }
  }

  /** A row of small dot-matrix squares (the punched-block rows in the plates). */
  private drawDotBlockRow(
    ctx: CanvasRenderingContext2D,
    random: () => number,
    color: THREE.Color,
    x0: number,
    y: number,
    width: number,
  ): void {
    ctx.fillStyle = this.rowStyle(random, color);
    const dot = 4 + Math.floor(random() * 3);
    const count = 3 + Math.floor(random() * Math.max(3, width / (dot * 2.4)));
    let x = x0;
    for (let i = 0; i < count && x < x0 + width - dot; i++) {
      if (random() > 0.25) ctx.fillRect(x, y, dot, dot + 2);
      x += dot + 3;
    }
  }

  /** A solid bright bar, like the white/amber slab highlights in the plates. */
  private drawBarRow(
    ctx: CanvasRenderingContext2D,
    random: () => number,
    color: THREE.Color,
    x0: number,
    y: number,
    width: number,
  ): void {
    ctx.fillStyle = this.rowStyle(random, color);
    const w = width * (0.25 + random() * 0.6);
    const x = x0 + (random() < 0.5 ? 0 : width - w);
    ctx.fillRect(x, y, w, 7 + Math.floor(random() * 5));
  }

  /** A short report fragment: a word, a figure run, or a word:figure pair. */
  private dataFragment(random: () => number): string {
    const word = DATA_WORDS[Math.floor(random() * DATA_WORDS.length)];
    const roll = random();
    if (roll < 0.3) {
      let digits = "";
      const len = 3 + Math.floor(random() * 5);
      for (let i = 0; i < len; i++) digits += Math.floor(random() * 10);
      return digits;
    }
    if (roll < 0.45) return `${word}:${Math.floor(random() * 98)}`;
    if (roll < 0.55) return `${word}-${DATA_WORDS[Math.floor(random() * DATA_WORDS.length)]}`;
    return word;
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

  /**
   * Stream the data faces. Clones share this texture/material by reference,
   * so animating the prototype animates every tile.
   */
  update(dt: number): void {
    this.time += dt;
    if (this.dataTexture) this.dataTexture.offset.y -= this.scrollSpeed * dt;
    if (this.dataMaterial) {
      this.dataMaterial.opacity =
        0.82 +
        0.06 * Math.sin(this.time * 5.1 + this.flickerPhase) +
        0.04 * Math.sin(this.time * 13.7 + this.flickerPhase * 2);
    }
  }

  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.textures.forEach((t) => t.dispose());
    this.materials.forEach((m) => m.dispose());
    this.hotspotMeshes.forEach((m) => (m.material as THREE.Material).dispose());
  }
}
