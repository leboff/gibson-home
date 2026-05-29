import * as THREE from "three";
import { resolveColor } from "./materials";

const MENU_TEXTURE_WIDTH = 768;
const MENU_TEXTURE_HEIGHT = 1024;
const MENU_WORLD_HEIGHT = 12;
const FACE_OFFSET = 2;
const OPEN_DURATION = 0.34;

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * A Hackers-style filesystem menu rendered as a single in-world panel.
 *
 * It lists every site section (one row each, with a `>` cursor) and highlights
 * the active row in a boxed accent — echoing the Gibson UI from the film. The
 * panel is anchored just in front of the selected hotspot's tower face and is
 * re-synced to that face each frame, so it stays glued in place as the tiled
 * tower field recentres on the moving camera.
 *
 * On open it animates out of the tower face (growing + sliding forward + fading
 * in). Individual rows are pickable via UV → row mapping (see `rowAtUv`).
 */
export class GibsonMenu {
  readonly object: THREE.Group;

  private readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;

  private anchor: THREE.Object3D | null = null;
  private open = false;
  private progress = 0;

  // Row layout (canvas pixels) recorded on each draw, used for hit-testing.
  private rowTop = 0;
  private rowHeight = 1;
  private rowCount = 0;

  private readonly worldPos = new THREE.Vector3();
  private readonly worldQuat = new THREE.Quaternion();
  private readonly normal = new THREE.Vector3();

  constructor() {
    this.object = new THREE.Group();
    this.object.visible = false;
    this.object.renderOrder = 10;

    this.canvas = document.createElement("canvas");
    this.canvas.width = MENU_TEXTURE_WIDTH;
    this.canvas.height = MENU_TEXTURE_HEIGHT;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create Gibson menu texture");
    this.ctx = ctx;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.anisotropy = 4;

    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });

    const aspect = MENU_TEXTURE_WIDTH / MENU_TEXTURE_HEIGHT;
    const geo = new THREE.PlaneGeometry(MENU_WORLD_HEIGHT * aspect, MENU_WORLD_HEIGHT);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.renderOrder = 10;
    this.object.add(this.mesh);
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** World-space height of the panel (used to frame the camera on it). */
  get panelHeight(): number {
    return MENU_WORLD_HEIGHT;
  }

  /** How far the panel floats in front of its anchor tower face. */
  get faceOffset(): number {
    return FACE_OFFSET;
  }

  /** The single mesh used as a raycast target while the menu is open. */
  get pickMesh(): THREE.Mesh {
    return this.mesh;
  }

  /** Present the menu in front of `anchor`, highlighting `activeIndex`. */
  show(
    items: string[],
    activeIndex: number,
    anchor: THREE.Object3D,
    accentKey: string,
  ): void {
    this.draw(items, activeIndex, accentKey);
    this.anchor = anchor;
    // Only replay the grow-out animation when opening fresh, not when the menu
    // simply moves to a neighbouring section while already open.
    if (!this.open) this.progress = 0;
    this.open = true;
    this.object.visible = true;
    this.update(0);
  }

  hide(): void {
    this.open = false;
    this.anchor = null;
    this.progress = 0;
    this.object.visible = false;
  }

  /** Map a raycast UV hit on the panel to a row index, or null if outside. */
  rowAtUv(uv: THREE.Vector2 | undefined): number | null {
    if (!uv) return null;
    // CanvasTexture flips Y: uv.y = 0 is the bottom of the canvas image.
    const canvasY = (1 - uv.y) * this.canvas.height;
    const idx = Math.floor((canvasY - this.rowTop) / this.rowHeight);
    if (idx < 0 || idx >= this.rowCount) return null;
    return idx;
  }

  /** Advance the open animation and re-anchor to the live tower face. */
  update(dt: number): void {
    if (!this.open || !this.anchor) return;

    this.progress = Math.min(1, this.progress + dt / OPEN_DURATION);
    const e = easeOutCubic(this.progress);

    this.anchor.getWorldPosition(this.worldPos);
    this.anchor.getWorldQuaternion(this.worldQuat);
    this.normal.set(0, 0, 1).applyQuaternion(this.worldQuat);

    const offset = THREE.MathUtils.lerp(0.3, FACE_OFFSET, e);
    this.object.position.copy(this.worldPos).addScaledVector(this.normal, offset);
    this.object.quaternion.copy(this.worldQuat);

    const scale = THREE.MathUtils.lerp(0.08, 1, e);
    this.object.scale.set(scale, scale, scale);
    this.material.opacity = e;
  }

  private draw(items: string[], activeIndex: number, accentKey: string): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const accent = resolveColor(accentKey);
    const css = (a: number) =>
      `rgba(${Math.round(accent.r * 255)}, ${Math.round(accent.g * 255)}, ${Math.round(
        accent.b * 255,
      )}, ${a})`;

    ctx.clearRect(0, 0, w, h);

    // Panel backing — a dark translucent CRT slab with a glowing frame.
    ctx.fillStyle = "rgba(2, 10, 14, 0.82)";
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 6;
    ctx.strokeStyle = css(0.9);
    ctx.shadowColor = css(0.9);
    ctx.shadowBlur = 22;
    ctx.strokeRect(14, 14, w - 28, h - 28);

    // Header.
    const pad = 56;
    ctx.textBaseline = "middle";
    ctx.fillStyle = css(0.95);
    ctx.font = "bold 40px 'Courier New', monospace";
    ctx.fillText("// GIBSON DIRECTORY", pad, 78);
    ctx.shadowBlur = 14;
    ctx.fillRect(pad, 116, w - pad * 2, 4);

    // Rows.
    const top = 168;
    const bottom = h - 70;
    const rowH = Math.min(118, (bottom - top) / Math.max(items.length, 1));
    this.rowTop = top;
    this.rowHeight = rowH;
    this.rowCount = items.length;

    ctx.font = "bold 52px 'Courier New', monospace";
    items.forEach((item, i) => {
      const cy = top + rowH * i + rowH / 2;
      const text = item.toUpperCase();
      const isActive = i === activeIndex;

      if (isActive) {
        ctx.shadowBlur = 26;
        ctx.fillStyle = css(0.22);
        ctx.fillRect(pad - 18, cy - rowH / 2 + 8, w - pad * 2 + 36, rowH - 16);
        ctx.lineWidth = 4;
        ctx.strokeStyle = css(1);
        ctx.strokeRect(pad - 18, cy - rowH / 2 + 8, w - pad * 2 + 36, rowH - 16);
      }

      ctx.shadowBlur = isActive ? 24 : 12;
      ctx.fillStyle = isActive ? "rgba(235, 255, 255, 1)" : css(0.78);
      ctx.fillText(`${isActive ? "\u25B6" : "\u203A"}  ${text}`, pad + 10, cy);

      ctx.fillStyle = isActive ? css(1) : css(0.5);
      ctx.fillText("\u25B8", w - pad - 28, cy);
    });

    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
