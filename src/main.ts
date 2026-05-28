import "./styles.css";
import { detectCapabilities } from "./interaction/capabilities";
import { CameraRig } from "./interaction/CameraRig";
import { GibsonScene } from "./scene/GibsonScene";
import { GridFloor } from "./scene/GridFloor";
import { TowerField } from "./scene/TowerField";
import { Picker } from "./interaction/Picker";
import { Navigation } from "./interaction/Navigation";
import { Overlay } from "./ui/Overlay";
import { buildA11yFallback } from "./ui/A11yFallback";

function bootstrap(): void {
  const sceneRoot = document.getElementById("scene-root")!;
  const overlayRoot = document.getElementById("overlay-root")!;
  const liveRegion = document.getElementById("a11y-live")!;
  const fallbackNav = document.getElementById("a11y-fallback")!;
  const hint = document.getElementById("hint")!;

  const caps = detectCapabilities();

  // Camera + controls first — the scene composer needs the camera.
  const rig = new CameraRig(sceneRoot, caps.prefersReducedMotion);

  const gibson = new GibsonScene(sceneRoot, rig.camera, caps);

  // Fewer tiles on mobile (the denser fog hides the smaller field's edge).
  const field = new TowerField(caps.isMobile ? 1 : 2);
  const grid = new GridFloor();
  gibson.scene.add(grid.object, field.object);

  // UI
  const overlay = new Overlay(overlayRoot);
  buildA11yFallback(fallbackNav);

  // Interaction
  const navigation = new Navigation(sceneRoot, rig, field, overlay, liveRegion);
  new Picker(sceneRoot, rig.camera, field.hotspotMeshes, (data) =>
    navigation.selectByMesh(data),
  );

  // Hide the hint after the first interaction.
  let hintHidden = false;
  const hideHint = (): void => {
    if (hintHidden) return;
    hintHidden = true;
    hint.classList.add("is-hidden");
  };
  sceneRoot.addEventListener("pointerdown", hideHint, { once: true });
  sceneRoot.addEventListener("keydown", hideHint, { once: true });
  setTimeout(hideHint, 9000);

  // Resize is handled inside GibsonScene for the renderer/composer; the camera
  // aspect lives on the rig.
  window.addEventListener("resize", () => rig.resize());

  // Single render loop driving every system.
  gibson.start((dt) => {
    rig.update(dt);
    const { x, z } = rig.camera.position;
    field.update(x, z);
    grid.update(x, z);
  });

  // Give the canvas focus so keyboard nav works without an extra click on
  // desktop (but don't steal focus on touch devices where it pops a keyboard).
  if (!caps.isMobile) sceneRoot.focus();
}

bootstrap();
