import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * Owns the camera and OrbitControls and provides two motion modes:
 *
 *  - Free travel: arrow-key strafe/forward across the ground plane, plus a
 *    gentle idle drift (the Gibson flythrough). Both camera and orbit target
 *    move together so orientation is preserved while panning the endless plane.
 *  - Fly-to: a damped tween that frames a hotspot panel face-on.
 *
 * Touch/drag orbit and pinch zoom come from OrbitControls itself.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  /** -1..1 movement input from the keyboard, set by Navigation. */
  moveForward = 0;
  moveRight = 0;

  private flying = false;
  private readonly flyPos = new THREE.Vector3();
  private readonly flyTarget = new THREE.Vector3();
  private lastInteraction = 0;
  private readonly reducedMotion: boolean;
  private idleEnabled: boolean;

  private readonly moveSpeed = 42;
  private readonly idleSpeed = 3.2;

  constructor(domElement: HTMLElement, reducedMotion: boolean) {
    this.reducedMotion = reducedMotion;
    this.idleEnabled = !reducedMotion;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000,
    );
    this.camera.position.set(0, 26, 64);

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.target.set(0, 14, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 130;
    // Keep the camera above the floor and out of a straight-down/flip view.
    this.controls.minPolarAngle = 0.15;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = false;

    this.controls.addEventListener("start", () => this.onInteract());
    this.controls.update();
  }

  private onInteract(): void {
    this.lastInteraction = performance.now();
  }

  /** Note any external interaction (e.g. keyboard) to pause idle drift. */
  bump(): void {
    this.onInteract();
  }

  /** Frame a hotspot panel face-on. Snaps instantly under reduced motion. */
  flyTo(mesh: THREE.Object3D, distance = 24, height = 5): void {
    const p = mesh.getWorldPosition(new THREE.Vector3());
    const normal = mesh.getWorldDirection(new THREE.Vector3()).normalize();
    this.flyTarget.copy(p);
    this.flyPos.copy(p).addScaledVector(normal, distance);
    this.flyPos.y += height;

    this.onInteract();

    if (this.reducedMotion) {
      this.camera.position.copy(this.flyPos);
      this.controls.target.copy(this.flyTarget);
      this.controls.update();
      return;
    }
    this.flying = true;
    this.controls.enabled = false;
  }

  /** Horizontal forward direction (camera look projected onto the ground). */
  private groundForward(out: THREE.Vector3): THREE.Vector3 {
    this.camera.getWorldDirection(out);
    out.y = 0;
    if (out.lengthSq() < 1e-6) out.set(0, 0, -1);
    return out.normalize();
  }

  update(dt: number): void {
    if (this.flying) {
      const k = 1 - Math.pow(0.0009, dt); // frame-rate-independent damping
      this.camera.position.lerp(this.flyPos, k);
      this.controls.target.lerp(this.flyTarget, k);
      this.controls.update();
      if (
        this.camera.position.distanceToSquared(this.flyPos) < 0.04 &&
        this.controls.target.distanceToSquared(this.flyTarget) < 0.04
      ) {
        this.flying = false;
        this.controls.enabled = true;
      }
      return;
    }

    const forward = this.groundForward(new THREE.Vector3());
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();

    if (this.moveForward !== 0 || this.moveRight !== 0) {
      this.onInteract();
      const delta = new THREE.Vector3()
        .addScaledVector(forward, this.moveForward)
        .addScaledVector(right, this.moveRight)
        .multiplyScalar(this.moveSpeed * dt);
      this.camera.position.add(delta);
      this.controls.target.add(delta);
    } else if (this.idleEnabled && performance.now() - this.lastInteraction > 6000) {
      // Gentle automatic flythrough after a spell of inactivity.
      const drift = forward.multiplyScalar(this.idleSpeed * dt);
      this.camera.position.add(drift);
      this.controls.target.add(drift);
    }

    this.controls.update();
  }

  resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
