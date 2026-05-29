import * as THREE from "three";

/**
 * The neon palette and shared material factories.
 *
 * Materials are cached per colour so every tower of the same colour reuses one
 * material instance — fewer GPU state changes and less GC churn.
 */

export const PALETTE = {
  cyan: "#00fff7",
  magenta: "#ff2bd6",
  green: "#39ff14",
  amber: "#ffb000",
  violet: "#9d4bff",
  blue: "#2b6bff",
} as const;

export type PaletteKey = keyof typeof PALETTE;

export function resolveColor(key: PaletteKey | string): THREE.Color {
  const hex = (PALETTE as Record<string, string>)[key] ?? key;
  return new THREE.Color(hex);
}

const faceCache = new Map<string, THREE.MeshStandardMaterial>();
const edgeCache = new Map<string, THREE.LineBasicMaterial>();

/**
 * Dark-bodied block material with a strong emissive glow so the bloom pass
 * lights up the tower faces. The look is driven by emission, not lighting.
 */
export function makeNeonMaterial(key: PaletteKey | string): THREE.MeshStandardMaterial {
  const cacheKey = String(key);
  let mat = faceCache.get(cacheKey);
  if (!mat) {
    const color = resolveColor(key);
    mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.24,
      opacity: 0.26,
      transparent: true,
      roughness: 0.22,
      metalness: 0,
      depthWrite: false,
    });
    faceCache.set(cacheKey, mat);
  }
  return mat;
}

/** Bright line material for the iconic glowing wireframe edges. */
export function makeEdgeMaterial(key: PaletteKey | string): THREE.LineBasicMaterial {
  const cacheKey = String(key);
  let mat = edgeCache.get(cacheKey);
  if (!mat) {
    mat = new THREE.LineBasicMaterial({
      color: resolveColor(key),
      transparent: true,
      opacity: 0.9,
    });
    edgeCache.set(cacheKey, mat);
  }
  return mat;
}

export function disposeMaterials(): void {
  faceCache.forEach((m) => m.dispose());
  edgeCache.forEach((m) => m.dispose());
  faceCache.clear();
  edgeCache.clear();
}
