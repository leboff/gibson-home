import type { TowerConfig } from "../types";
import type { PaletteKey } from "../scene/materials";

/**
 * The single source of truth for the scene, navigation order, and the
 * accessible link list.
 *
 * Towers are laid out within one square tile of size TILE_SIZE x TILE_SIZE.
 * The tile is repeated across the ground plane (see TowerField) to create the
 * endless, loop-in-any-direction Gibson field.
 *
 * Only some towers carry `hotspots`; the rest are decorative skyline. To wire a
 * hotspot to a real page later, set its `link.url`.
 */

export const TILE_SIZE = 90;
export const DEFAULT_DECORATIVE_COUNT = 8;
const ALL_COLORS: PaletteKey[] = ["cyan", "magenta", "green", "amber", "violet", "blue"];

export interface FieldParams {
  decorativeCount: number;
  tileSize: number;
  minHeight: number;
  maxHeight: number;
  colors: PaletteKey[];
}

export const DEFAULT_FIELD_PARAMS: FieldParams = {
  decorativeCount: DEFAULT_DECORATIVE_COUNT,
  tileSize: TILE_SIZE,
  minHeight: 9,
  maxHeight: 46,
  colors: [...ALL_COLORS],
};

export const CONTENT_TOWERS: TowerConfig[] = [
  // ---- Towers WITH hotspots (the navigable content) ----
  {
    id: "resume",
    label: "Resume tower",
    position: [-28, -22],
    colorKey: "cyan",
    blocks: [
      { width: 8, depth: 8, height: 14 },
      { width: 6, depth: 6, height: 10 },
      { width: 4, depth: 4, height: 8 },
    ],
    hotspots: [
      {
        id: "resume",
        heightFraction: 0.55,
        face: "s",
        link: {
          title: "Resume",
          description:
            "An overview of my experience, skills, and the roles I've held.",
          url: "",
        },
      },
    ],
  },
  {
    id: "projects",
    label: "Projects tower",
    position: [22, -30],
    colorKey: "magenta",
    blocks: [
      { width: 10, depth: 10, height: 18 },
      { width: 7, depth: 7, height: 12 },
      { width: 5, depth: 5, height: 9 },
      { width: 3, depth: 3, height: 6 },
    ],
    hotspots: [
      {
        id: "projects",
        heightFraction: 0.45,
        face: "s",
        link: {
          title: "Projects",
          description:
            "Selected things I've built — apps, experiments, and open source.",
          url: "",
        },
      },
      {
        id: "labs",
        heightFraction: 0.78,
        face: "e",
        accentColor: "#39ff14",
        link: {
          title: "Labs",
          description: "Rougher prototypes and weekend experiments.",
          url: "",
        },
      },
    ],
  },
  {
    id: "about",
    label: "About tower",
    position: [-6, 8],
    colorKey: "green",
    blocks: [
      { width: 9, depth: 9, height: 16 },
      { width: 6, depth: 6, height: 11 },
    ],
    hotspots: [
      {
        id: "about",
        heightFraction: 0.6,
        face: "s",
        link: {
          title: "About",
          description: "Who I am and what I care about building.",
          url: "",
        },
      },
    ],
  },
  {
    id: "writing",
    label: "Writing tower",
    position: [34, 18],
    colorKey: "amber",
    blocks: [
      { width: 7, depth: 7, height: 13 },
      { width: 5, depth: 5, height: 10 },
      { width: 3, depth: 3, height: 7 },
    ],
    hotspots: [
      {
        id: "writing",
        heightFraction: 0.5,
        face: "w",
        link: {
          title: "Writing",
          description: "Posts and notes on engineering and design.",
          url: "",
        },
      },
    ],
  },
  {
    id: "contact",
    label: "Contact tower",
    position: [4, 34],
    colorKey: "violet",
    blocks: [
      { width: 8, depth: 8, height: 12 },
      { width: 5, depth: 5, height: 9 },
    ],
    hotspots: [
      {
        id: "contact",
        heightFraction: 0.55,
        face: "n",
        link: {
          title: "Contact",
          description: "Ways to reach me — email and social links.",
          url: "",
        },
      },
    ],
  },

];

const BASE_DECORATIVE_TOWERS: TowerConfig[] = [
  { id: "d1", label: "tower", position: [-40, 14], colorKey: "blue", blocks: [{ width: 6, depth: 6, height: 22 }] },
  { id: "d2", label: "tower", position: [-18, 38], colorKey: "cyan", blocks: [{ width: 5, depth: 5, height: 9 }] },
  { id: "d3", label: "tower", position: [12, -8], colorKey: "blue", blocks: [{ width: 7, depth: 7, height: 26 }] },
  { id: "d4", label: "tower", position: [40, -8], colorKey: "violet", blocks: [{ width: 6, depth: 6, height: 15 }] },
  { id: "d5", label: "tower", position: [-38, -40], colorKey: "magenta", blocks: [{ width: 8, depth: 8, height: 11 }] },
  { id: "d6", label: "tower", position: [8, -42], colorKey: "amber", blocks: [{ width: 5, depth: 5, height: 20 }] },
  { id: "d7", label: "tower", position: [-12, -8], colorKey: "green", blocks: [{ width: 4, depth: 4, height: 7 }] },
  { id: "d8", label: "tower", position: [38, 40], colorKey: "blue", blocks: [{ width: 6, depth: 6, height: 17 }] },
];

export function generateTowerConfigs(params: FieldParams): TowerConfig[] {
  const minH = Math.max(1, Math.min(params.minHeight, params.maxHeight));
  const maxH = Math.max(minH, params.maxHeight);
  const count = Math.max(0, Math.round(params.decorativeCount));
  const availableColors = params.colors.length > 0 ? params.colors : [...ALL_COLORS];

  const halfTile = params.tileSize / 2;
  const margin = 4;
  const posScale = params.tileSize / TILE_SIZE;

  const content = CONTENT_TOWERS.map((tower) => {
    const seed = hash(`${tower.id}:content`);
    const random = seededRandom(seed);
    const height = randomInt(random, minH, maxH);
    const base = tower.blocks[0] ?? { width: 6, depth: 6, height };
    const color = pickColor(tower.colorKey, availableColors, random);
    const px = clamp(tower.position[0] * posScale, -halfTile + margin, halfTile - margin);
    const pz = clamp(tower.position[1] * posScale, -halfTile + margin, halfTile - margin);
    return {
      ...tower,
      position: [px, pz] as [number, number],
      colorKey: color,
      blocks: [{ width: base.width, depth: base.depth, height }],
    };
  });

  const decorative: TowerConfig[] = [];
  for (let i = 0; i < count; i++) {
    const source = BASE_DECORATIVE_TOWERS[i % BASE_DECORATIVE_TOWERS.length];
    const cycle = Math.floor(i / BASE_DECORATIVE_TOWERS.length);
    const seed = hash(`${source.id}:decor:${cycle}:${params.tileSize}`);
    const random = seededRandom(seed);
    const height = randomInt(random, minH, maxH);
    const jitter = 8 + random() * 14;
    const signX = random() > 0.5 ? 1 : -1;
    const signZ = random() > 0.5 ? 1 : -1;
    const color = pickColor(source.colorKey, availableColors, random);
    const width = source.blocks[0]?.width ?? 5;
    const depth = source.blocks[0]?.depth ?? 5;
    const px = clamp(source.position[0] + signX * jitter, -halfTile + 4, halfTile - 4);
    const pz = clamp(source.position[1] + signZ * jitter, -halfTile + 4, halfTile - 4);
    decorative.push({
      id: `${source.id}-${cycle}`,
      label: source.label,
      position: [px, pz],
      colorKey: color,
      blocks: [{ width, depth, height }],
    });
  }

  return [...content, ...decorative];
}

export const TOWERS: TowerConfig[] = generateTowerConfigs(DEFAULT_FIELD_PARAMS);

function pickColor(defaultColor: PaletteKey, available: PaletteKey[], random: () => number): PaletteKey {
  if (available.includes(defaultColor)) return defaultColor;
  return available[Math.floor(random() * available.length)];
}

function hash(value: string): number {
  let out = 2166136261;
  for (let i = 0; i < value.length; i++) {
    out ^= value.charCodeAt(i);
    out = Math.imul(out, 16777619);
  }
  return out >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

function randomInt(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
