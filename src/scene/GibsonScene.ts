import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import type { Capabilities } from "../interaction/capabilities";
import { createComposer } from "./postprocessing";

/**
 * Owns the renderer, scene, fog, lighting, post-processing composer, and the
 * render loop. Other systems (camera rig, tower field, grid) are added to
 * `scene` and updated via the per-frame callback passed to `start`.
 */
export class GibsonScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  private readonly composer: EffectComposer;
  private readonly camera: THREE.Camera;
  private readonly clock = new THREE.Clock();
  private readonly caps: Capabilities;
  private frame = 0;
  private onFrame: (dt: number) => void = () => {};

  constructor(mount: HTMLElement, camera: THREE.Camera, caps: Capabilities) {
    this.caps = caps;
    this.camera = camera;

    this.renderer = new THREE.WebGLRenderer({
      antialias: caps.antialias,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, caps.pixelRatioCap));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    mount.append(this.renderer.domElement);

    // The film's Gibson sits in a pure black void; fog only swallows the
    // corridor's vanishing point.
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, caps.isMobile ? 0.014 : 0.0105);

    // Minimal lighting — the look is driven by emissive materials + bloom.
    this.scene.add(new THREE.AmbientLight(0x1d4a55, 0.6));
    const hemi = new THREE.HemisphereLight(0x2a8c99, 0x0a0518, 0.5);
    this.scene.add(hemi);

    this.composer = createComposer(this.renderer, this.scene, camera, caps);

    window.addEventListener("resize", this.handleResize);
  }

  start(onFrame: (dt: number) => void): void {
    this.onFrame = onFrame;
    this.loop();
  }

  private loop = (): void => {
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.onFrame(dt);
    if (this.caps.bloom) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  };

  private handleResize = (): void => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  };

  dispose(): void {
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.handleResize);
    this.composer.dispose();
    this.renderer.dispose();
  }
}
