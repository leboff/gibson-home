/**
 * Data model for the Gibson tower field.
 *
 * Everything the scene, navigation, and accessible fallback render is driven by
 * the `TowerConfig[]` exported from `config/towers.ts`. To turn a placeholder
 * hotspot into a live link, just set its `link.url` — no other code changes.
 */

import type { PaletteKey } from "./scene/materials";

/** A single horizontal face of a tower. */
export type Face = "n" | "s" | "e" | "w";

/** The destination a hotspot points at. An empty `url` renders as a disabled
 *  "coming soon" button. */
export interface HotspotLink {
  title: string;
  description: string;
  url: string;
}

/** An interactive spot mounted on a tower face. */
export interface Hotspot {
  id: string;
  /** 0..1 position up the tower's total height. */
  heightFraction: number;
  /** Which face to mount on (defaults to "s"). */
  face?: Face;
  /** Optional override colour; defaults to the tower colour. */
  accentColor?: string;
  link: HotspotLink;
}

/** One stacked box making up part of a tower silhouette. */
export interface TowerBlock {
  height: number;
  width: number;
  depth: number;
}

/** A tower in the repeating tile. Towers without `hotspots` are decorative. */
export interface TowerConfig {
  id: string;
  label: string;
  /** [x, z] position within the repeating TILE_SIZE x TILE_SIZE cell. */
  position: [number, number];
  colorKey: PaletteKey;
  blocks: TowerBlock[];
  hotspots?: Hotspot[];
}
