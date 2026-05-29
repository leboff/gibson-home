import * as THREE from "three";
import type { HotspotUserData } from "../scene/Tower";
import type { GibsonMenu } from "../scene/GibsonMenu";

/**
 * Turns a tap/click into a hotspot selection via raycasting, ignoring drags
 * (so orbiting the camera doesn't trigger a selection).
 *
 * While the Gibson menu is open it takes pointer precedence: a tap on the menu
 * panel resolves to a row (via UV mapping) and routes to `onPickMenuRow`.
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
    private readonly menu: GibsonMenu,
    private readonly onPickMenuRow: (row: number) => void,
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

    // The open menu sits in front of the towers, so test it first.
    const objects: THREE.Object3D[] = this.menu.isOpen
      ? [this.menu.pickMesh, ...this.targets]
      : this.targets;
    const hits = this.raycaster.intersectObjects(objects, false);
    if (hits.length === 0) return;

    const hit = hits[0];
    if (this.menu.isOpen && hit.object === this.menu.pickMesh) {
      const row = this.menu.rowAtUv(hit.uv);
      if (row !== null) this.onPickMenuRow(row);
      return;
    }

    const mesh = hit.object as THREE.Mesh;
    const data = mesh.userData as HotspotUserData;
    if (data?.kind === "hotspot") this.onPick(data, mesh);
  };

  dispose(): void {
    this.dom.removeEventListener("pointerdown", this.handleDown);
    this.dom.removeEventListener("pointerup", this.handleUp);
  }
}
