import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { Capabilities } from "../interaction/capabilities";

/**
 * Bloom composer: RenderPass -> UnrealBloomPass -> OutputPass. Only emissive
 * neon (towers, grid, hotspots) is bright enough to bloom. The pass is
 * downscaled on mobile via `bloomScale`.
 */
export function createComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  caps: Capabilities,
): EffectComposer {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);

  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(size.x * caps.bloomScale, size.y * caps.bloomScale),
    0.55, // strength — a halo around the data, not a white-out
    0.45, // radius
    0.3, // threshold — keep dark surfaces out of the bloom
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  return composer;
}
