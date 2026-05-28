import * as THREE from "three";
import type { HotspotUserData } from "../scene/Tower";

/**
 * Turns a tap/click into a hotspot selection via raycasting, ignoring drags
 * (so orbiting the camera doesn't trigger a selection).
 */
export class Picker {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private downX = 0;
  private downY = 0;
  private downTime = 0;

  constructor(
    private readonly dom: HTMLElement,
    private readonly camera: THREE.Camera,
    private readonly targets: THREE.Object3D[],
    private readonly onPick: (data: HotspotUserData, mesh: THREE.Mesh) => void,
  ) {
    dom.addEventListener("pointerdown", this.handleDown);
    dom.addEventListener("pointerup", this.handleUp);
  }

  private handleDown = (e: PointerEvent): void => {
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.downTime = performance.now();
  };

  private handleUp = (e: PointerEvent): void => {
    const moved = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
    const elapsed = performance.now() - this.downTime;
    // Treat as a tap only if the pointer barely moved and was brief.
    if (moved > 8 || elapsed > 600) return;

    const rect = this.dom.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.targets, false);
    if (hits.length === 0) return;

    const mesh = hits[0].object as THREE.Mesh;
    const data = mesh.userData as HotspotUserData;
    if (data?.kind === "hotspot") this.onPick(data, mesh);
  };

  dispose(): void {
    this.dom.removeEventListener("pointerdown", this.handleDown);
    this.dom.removeEventListener("pointerup", this.handleUp);
  }
}
