import * as THREE from "three";
import type { CameraRig } from "./CameraRig";
import type { LogicalHotspot, TowerField } from "../scene/TowerField";
import type { Overlay } from "../ui/Overlay";
import type { GibsonMenu } from "../scene/GibsonMenu";
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
  // True from the moment a menu starts opening until it is closed — including
  // the fly transition where the panel is briefly hidden between sections.
  private menuActive = false;
  private readonly pressed = new Set<string>();

  constructor(
    private readonly sceneRoot: HTMLElement,
    private readonly rig: CameraRig,
    private readonly field: TowerField,
    private readonly overlay: Overlay,
    private readonly live: HTMLElement,
    private readonly menu: GibsonMenu,
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
    if (idx < 0) return;
    if (this.menuActive) {
      this.focusIndex(idx, true);
    } else {
      this.currentIndex = idx;
      this.openCurrent();
    }
  }

  /** Selection coming from a tap/click on an open menu row. */
  selectMenuRow(row: number): void {
    if (row < 0 || row >= this.field.logicalHotspots.length) return;
    this.focusIndex(row, true);
  }

  private onBlur = (): void => {
    this.pressed.clear();
    this.rig.moveForward = 0;
    this.rig.moveRight = 0;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    // While the menu is active, arrows/WASD walk the rows instead of flying.
    if (this.menuActive) {
      switch (e.key) {
        case "ArrowUp":
        case "ArrowLeft":
        case "w":
        case "W":
        case "a":
        case "A":
          e.preventDefault();
          this.cycle(-1);
          return;
        case "ArrowDown":
        case "ArrowRight":
        case "s":
        case "S":
        case "d":
        case "D":
          e.preventDefault();
          this.cycle(1);
          return;
        case "Enter":
        case " ":
        case "Spacebar":
          e.preventDefault();
          return;
        case "Escape":
          e.preventDefault();
          this.closeMenu();
          return;
      }
    }

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
        if (this.menuActive) {
          this.closeMenu();
          return;
        }
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

    if (this.menuActive && mesh) {
      // Collapse the menu, fly to the new section, then grow it out afresh on
      // arrival (the field stays frozen so the target tower can't recycle).
      this.menu.hide();
      this.flyToFraming(mesh, index);
    } else if (fly && mesh) {
      this.rig.flyTo(mesh);
    }
    this.announce(logical);
  }

  private openCurrent(): void {
    if (this.currentIndex < 0) return;
    const index = this.currentIndex;
    const logical = this.field.logicalHotspots[index];
    const mesh = this.field.nearestHotspotMesh(
      logical.hotspot.id,
      this.rig.camera.position,
    );
    if (!mesh) return;

    // Freeze the tile grid so the chosen tower can't recycle away mid-fly, and
    // suppress idle drift so the framed menu stays put.
    this.menuActive = true;
    this.field.setFrozen(true);
    this.rig.suppressIdle(true);
    this.setHighlight(mesh);
    this.menu.hide();
    this.flyToFraming(mesh, index);
  }

  /**
   * Fly to a standoff that shows the tower with its side menu popped out. The
   * rig fits the panel to ~55% of the viewport height and keeps the panel
   * fully in frame even on narrow (portrait) viewports.
   */
  private flyToFraming(mesh: THREE.Mesh, index: number): void {
    this.rig.flyToFill(
      mesh,
      {
        panelHeight: this.menu.panelHeight,
        faceOffset: this.menu.faceOffset,
        fill: 0.55,
        sideOffset: this.menu.sideOffset,
        panelWidth: this.menu.panelWidth,
        // Half-width of the widest tower slab (11 units wide).
        towerHalfWidth: 5.5,
      },
      () => this.presentMenu(index, mesh),
    );
  }

  private closeMenu(): void {
    this.menuActive = false;
    this.menu.hide();
    this.field.setFrozen(false);
    this.rig.suppressIdle(false);
  }

  /** Build and show the in-world Gibson menu anchored to a hotspot face. */
  private presentMenu(index: number, mesh: THREE.Mesh): void {
    const items = this.field.logicalHotspots.map((l) => l.hotspot.link.title);
    const accent = this.field.logicalHotspots[index].hotspot.accentColor ?? "cyan";
    this.menu.show(items, index, mesh, accent);
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
    this.live.textContent = this.menuActive
      ? `${logical.hotspot.link.title} selected. Use arrow keys to browse, Escape to close.`
      : `Focused ${logical.hotspot.link.title} on ${logical.towerLabel}. Press Enter to open.`;
  }

  reset(): void {
    this.closeMenu();
    this.currentIndex = -1;
    this.pressed.clear();
    this.rig.moveForward = 0;
    this.rig.moveRight = 0;
    this.setHighlight(null);
    this.live.textContent = "Tower field rebuilt.";
  }

  dispose(): void {
    this.sceneRoot.removeEventListener("keydown", this.onKeyDown);
    this.sceneRoot.removeEventListener("keyup", this.onKeyUp);
    this.sceneRoot.removeEventListener("blur", this.onBlur);
  }
}
