import * as THREE from "three";

/**
 * The neon palette and shared material factories.
 *
 * Materials are cached per colour so every tower of the same colour reuses one
 * material instance — fewer GPU state changes and less GC churn.
 */

/**
 * Tuned to the Gibson fly-through plates from Hackers (1995): icy cyan and
 * teal-green tower glass with amber data accents, violet/blue reserved for the
 * circuit-trace floor.
 */
export const PALETTE = {
  cyan: "#86e8ff",
  magenta: "#b44dff",
  green: "#3fffc2",
  amber: "#ffb347",
  violet: "#7b4dff",
  blue: "#4f9bff",
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
      emissiveIntensity: 0.14,
      opacity: 0.16,
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
    // In the film plates the slab outline is faint — the data text carries
    // almost all of the glow.
    mat = new THREE.LineBasicMaterial({
      color: resolveColor(key),
      transparent: true,
      opacity: 0.55,
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
