import * as THREE from "three";
import { PALETTE } from "./materials";

/**
 * A neon grid floor. It's a fixed-size GridHelper that recentres on the camera
 * each frame (snapped to the grid spacing) so it reads as an endless plane
 * without ever growing the geometry.
 */
export class GridFloor {
  readonly object: THREE.Group;
  private readonly grid: THREE.GridHelper;
  private readonly spacing: number;

  constructor(size = 600, divisions = 120) {
    this.spacing = size / divisions;

    this.grid = new THREE.GridHelper(
      size,
      divisions,
      new THREE.Color(PALETTE.cyan),
      new THREE.Color(PALETTE.cyan),
    );
    const mat = this.grid.material as THREE.LineBasicMaterial;
    mat.transparent = true;
    mat.opacity = 0.35;

    // A near-black plane just below the grid catches a little bloom and hides
    // the void seam directly under the camera.
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({ color: 0x07021a }),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.05;

    this.object = new THREE.Group();
    this.object.add(plane, this.grid);
  }

  /** Snap the floor under the camera so it appears infinite. */
  update(cameraX: number, cameraZ: number): void {
    this.object.position.x = Math.round(cameraX / this.spacing) * this.spacing;
    this.object.position.z = Math.round(cameraZ / this.spacing) * this.spacing;
  }

  dispose(): void {
    this.grid.geometry.dispose();
    (this.grid.material as THREE.Material).dispose();
    this.object.children.forEach((c) => {
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      }
    });
  }
}
