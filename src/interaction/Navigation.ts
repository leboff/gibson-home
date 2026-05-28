import * as THREE from "three";
import type { CameraRig } from "./CameraRig";
import type { LogicalHotspot, TowerField } from "../scene/TowerField";
import type { Overlay } from "../ui/Overlay";
import type { HotspotUserData } from "../scene/Tower";

const HIGHLIGHT_EMISSIVE = 2.4;
const HIGHLIGHT_SCALE = 1.35;

/**
 * Keyboard navigation for the scene.
 *
 *  - Arrow keys / WASD: fly the camera horizontally across the looping plane.
 *  - Tab / Shift+Tab: cycle through the hotspot towers (fly to the nearest live
 *    instance and highlight it).
 *  - Enter / Space: open the focused hotspot's detail card.
 *  - Escape: close the card, or (if none open) release the canvas focus so the
 *    user can Tab out to the accessible link list.
 *
 * Pointer selection (Picker) routes through the same `selectByMesh` entry point.
 */
export class Navigation {
  private currentIndex = -1;
  private highlighted: THREE.Mesh | null = null;
  private readonly pressed = new Set<string>();

  constructor(
    private readonly sceneRoot: HTMLElement,
    private readonly rig: CameraRig,
    private readonly field: TowerField,
    private readonly overlay: Overlay,
    private readonly live: HTMLElement,
  ) {
    sceneRoot.addEventListener("keydown", this.onKeyDown);
    sceneRoot.addEventListener("keyup", this.onKeyUp);
    sceneRoot.addEventListener("blur", this.onBlur);

    overlay.onClose(() => this.sceneRoot.focus());
  }

  /** Selection coming from a tap/click on a specific hotspot mesh. */
  selectByMesh(data: HotspotUserData): void {
    const idx = this.field.logicalHotspots.findIndex(
      (l) => l.hotspot.id === data.hotspot.id && l.towerId === data.towerId,
    );
    if (idx >= 0) {
      this.focusIndex(idx, false);
      this.openCurrent();
    }
  }

  private onBlur = (): void => {
    this.pressed.clear();
    this.rig.moveForward = 0;
    this.rig.moveRight = 0;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case "Tab":
        e.preventDefault();
        this.cycle(e.shiftKey ? -1 : 1);
        return;
      case "Enter":
        e.preventDefault();
        if (this.currentIndex < 0) this.cycle(1);
        else this.openCurrent();
        return;
      case " ":
      case "Spacebar":
        e.preventDefault();
        if (this.currentIndex >= 0) this.openCurrent();
        return;
      case "Escape":
        if (!this.overlay.isOpen) {
          // Release the application so Tab reaches the page's link list.
          this.sceneRoot.blur();
        }
        return;
      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight":
      case "w":
      case "a":
      case "s":
      case "d":
      case "W":
      case "A":
      case "S":
      case "D":
        e.preventDefault();
        this.pressed.add(e.key.toLowerCase());
        this.updateMoveInput();
        this.rig.bump();
        return;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.pressed.delete(e.key.toLowerCase());
    this.updateMoveInput();
  };

  private updateMoveInput(): void {
    const fwd =
      (this.pressed.has("arrowup") || this.pressed.has("w") ? 1 : 0) -
      (this.pressed.has("arrowdown") || this.pressed.has("s") ? 1 : 0);
    const right =
      (this.pressed.has("arrowright") || this.pressed.has("d") ? 1 : 0) -
      (this.pressed.has("arrowleft") || this.pressed.has("a") ? 1 : 0);
    this.rig.moveForward = fwd;
    this.rig.moveRight = right;
  }

  private cycle(dir: number): void {
    const n = this.field.logicalHotspots.length;
    if (n === 0) return;
    const next =
      this.currentIndex < 0
        ? dir > 0
          ? 0
          : n - 1
        : (this.currentIndex + dir + n) % n;
    this.focusIndex(next, true);
  }

  private focusIndex(index: number, fly: boolean): void {
    this.currentIndex = index;
    const logical = this.field.logicalHotspots[index];
    const mesh = this.field.nearestHotspotMesh(
      logical.hotspot.id,
      this.rig.camera.position,
    );
    this.setHighlight(mesh);
    if (mesh && fly) this.rig.flyTo(mesh);
    this.announce(logical);
  }

  private openCurrent(): void {
    if (this.currentIndex < 0) return;
    const logical = this.field.logicalHotspots[this.currentIndex];
    this.overlay.show(logical.hotspot, logical.towerLabel, logical.hotspot.accentColor);
  }

  private setHighlight(mesh: THREE.Mesh | null): void {
    if (this.highlighted && this.highlighted !== mesh) {
      const prev = this.highlighted.userData as HotspotUserData;
      (this.highlighted.material as THREE.MeshStandardMaterial).emissiveIntensity =
        prev.baseEmissive;
      this.highlighted.scale.setScalar(1);
    }
    this.highlighted = mesh;
    if (mesh) {
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = HIGHLIGHT_EMISSIVE;
      mesh.scale.setScalar(HIGHLIGHT_SCALE);
    }
  }

  private announce(logical: LogicalHotspot): void {
    this.live.textContent = `Focused ${logical.hotspot.link.title} on ${logical.towerLabel}. Press Enter to open.`;
  }

  dispose(): void {
    this.sceneRoot.removeEventListener("keydown", this.onKeyDown);
    this.sceneRoot.removeEventListener("keyup", this.onKeyUp);
    this.sceneRoot.removeEventListener("blur", this.onBlur);
  }
}
