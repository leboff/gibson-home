import * as THREE from "three";

/**
 * The Gibson floor from the film plates: a near-black plane etched with
 * glowing violet/blue circuit-board traces — Manhattan runs with rounded
 * corners, terminal pads, and the occasional parallel bus pair.
 *
 * The traces are drawn once into a canvas texture. Every stroke is repeated
 * at the eight wrap offsets so the texture tiles seamlessly; the plane then
 * recentres under the camera (snapped to the texture's world tile size) so the
 * floor reads as endless.
 */

const TEX_SIZE = 1024;
const TRACE_COLORS = ["#7b4dff", "#5a3bff", "#9d5cff", "#4f9bff"];

export class GridFloor {
  readonly object: THREE.Group;
  private readonly plane: THREE.Mesh;
  private readonly texture: THREE.CanvasTexture;
  private readonly spacing: number;

  constructor(size = 800, repeats = 8) {
    // The plane snaps in whole texture tiles, so the move is invisible.
    this.spacing = size / repeats;

    this.texture = this.createCircuitTexture();
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.repeat.set(repeats, repeats);
    this.texture.anisotropy = 8;

    this.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({ map: this.texture }),
    );
    this.plane.rotation.x = -Math.PI / 2;
    this.plane.position.y = -0.05;

    this.object = new THREE.Group();
    this.object.add(this.plane);
  }

  private createCircuitTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = TEX_SIZE;
    canvas.height = TEX_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create circuit floor texture");

    const random = seededRandom(0x61b50);

    ctx.fillStyle = "#010104";
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    // Faint structural grid behind the traces.
    ctx.strokeStyle = "rgba(60, 110, 130, 0.07)";
    ctx.lineWidth = 1;
    for (let p = 0; p < TEX_SIZE; p += 128) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, TEX_SIZE);
      ctx.moveTo(0, p);
      ctx.lineTo(TEX_SIZE, p);
      ctx.stroke();
    }

    const traceCount = 16;
    for (let i = 0; i < traceCount; i++) {
      const color = TRACE_COLORS[Math.floor(random() * TRACE_COLORS.length)];
      const path = this.tracePath(random);
      const width = 5 + Math.floor(random() * 5);
      this.strokeWrapped(ctx, path, color, width);
      // Some runs are parallel bus pairs, like the film floor.
      if (random() < 0.35) {
        const offset = width + 7;
        const shifted = path.map(([x, y]) => [x + offset, y + offset] as [number, number]);
        this.strokeWrapped(ctx, shifted, color, width);
      }
    }

    return new THREE.CanvasTexture(canvas);
  }

  /** A Manhattan random walk: axis-aligned segments with 90-degree bends. */
  private tracePath(random: () => number): Array<[number, number]> {
    const points: Array<[number, number]> = [];
    let x = random() * TEX_SIZE;
    let y = random() * TEX_SIZE;
    let horizontal = random() > 0.5;
    points.push([x, y]);
    const segments = 3 + Math.floor(random() * 5);
    for (let s = 0; s < segments; s++) {
      const len = (40 + random() * 200) * (random() > 0.5 ? 1 : -1);
      if (horizontal) x += len;
      else y += len;
      points.push([x, y]);
      horizontal = !horizontal;
    }
    return points;
  }

  /**
   * Stroke a trace (rounded corners + glow + terminal pads) at all nine wrap
   * offsets so the canvas tiles without seams.
   */
  private strokeWrapped(
    ctx: CanvasRenderingContext2D,
    path: Array<[number, number]>,
    color: string,
    width: number,
  ): void {
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        ctx.save();
        ctx.translate(ox * TEX_SIZE, oy * TEX_SIZE);

        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;

        ctx.beginPath();
        const radius = 14;
        ctx.moveTo(path[0][0], path[0][1]);
        for (let i = 1; i < path.length - 1; i++) {
          ctx.arcTo(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1], radius);
        }
        const last = path[path.length - 1];
        ctx.lineTo(last[0], last[1]);
        ctx.stroke();

        // Terminal pads at both ends.
        for (const [px, py] of [path[0], last]) {
          ctx.beginPath();
          ctx.arc(px, py, width * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }
  }

  /** Snap the floor under the camera so it appears infinite. */
  update(cameraX: number, cameraZ: number): void {
    this.object.position.x = Math.round(cameraX / this.spacing) * this.spacing;
    this.object.position.z = Math.round(cameraZ / this.spacing) * this.spacing;
  }

  dispose(): void {
    this.texture.dispose();
    this.plane.geometry.dispose();
    (this.plane.material as THREE.Material).dispose();
  }
}

function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}
