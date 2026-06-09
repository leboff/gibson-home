import type { TowerConfig } from "../types";
import type { PaletteKey } from "../scene/materials";

/**
 * The single source of truth for the scene, navigation order, and the
 * accessible link list.
 *
 * Towers are laid out within one square tile of size TILE_SIZE x TILE_SIZE.
 * The tile is repeated across the ground plane (see TowerField) to create the
 * endless Gibson field.
 *
 * The layout reproduces the film's fly-through: monolith slabs aligned in
 * rows flanking a central data corridor down the Z axis, with a second outer
 * row behind each inner row. Content towers sit on the inner rows with their
 * hotspots facing the aisle.
 *
 * Only some towers carry `hotspots`; the rest are decorative skyline. To wire a
 * hotspot to a real page later, set its `link.url`.
 */

export const TILE_SIZE = 90;
export const DEFAULT_DECORATIVE_COUNT = 14;
const ALL_COLORS: PaletteKey[] = ["cyan", "magenta", "green", "amber", "violet", "blue"];

// Corridor geometry, as fractions of the tile size.
const INNER_ROW = 0.18;
const OUTER_ROW = 0.38;
const SLOTS_PER_ROW = 5;

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
  minHeight: 18,
  maxHeight: 48,
  // The film palette: icy cyan and teal-green glass, blue accents.
  colors: ["cyan", "green", "blue"],
};

export const CONTENT_TOWERS: TowerConfig[] = [
  // ---- Towers WITH hotspots (the navigable content) ----
  // Inner-left towers face "e" (toward the aisle), inner-right face "w".
  {
    id: "resume",
    label: "Resume tower",
    position: [-16, -36],
    colorKey: "cyan",
    blocks: [{ width: 10, depth: 10, height: 34 }],
    hotspots: [
      {
        id: "resume",
        heightFraction: 0.55,
        face: "e",
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
    position: [16, -18],
    colorKey: "green",
    blocks: [{ width: 11, depth: 11, height: 42 }],
    hotspots: [
      {
        id: "projects",
        heightFraction: 0.45,
        face: "w",
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
        face: "s",
        accentColor: "amber",
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
    position: [-16, 0],
    colorKey: "cyan",
    blocks: [{ width: 10, depth: 10, height: 38 }],
    hotspots: [
      {
        id: "about",
        heightFraction: 0.6,
        face: "e",
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
    position: [16, 18],
    colorKey: "blue",
    blocks: [{ width: 10, depth: 10, height: 30 }],
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
    position: [-16, 36],
    colorKey: "green",
    blocks: [{ width: 10, depth: 10, height: 36 }],
    hotspots: [
      {
        id: "contact",
        heightFraction: 0.55,
        face: "e",
        link: {
          title: "Contact",
          description: "Ways to reach me — email and social links.",
          url: "",
        },
      },
    ],
  },
];

export function generateTowerConfigs(params: FieldParams): TowerConfig[] {
  const minH = Math.max(1, Math.min(params.minHeight, params.maxHeight));
  const maxH = Math.max(minH, params.maxHeight);
  const count = Math.max(0, Math.round(params.decorativeCount));
  const availableColors = params.colors.length > 0 ? params.colors : [...ALL_COLORS];

  const posScale = params.tileSize / TILE_SIZE;
  const step = params.tileSize / SLOTS_PER_ROW;

  const content = CONTENT_TOWERS.map((tower) => {
    const seed = hash(`${tower.id}:content`);
    const random = seededRandom(seed);
    const height = randomInt(random, minH, maxH);
    const base = tower.blocks[0] ?? { width: 10, depth: 10, height };
    const color = pickColor(tower.colorKey, availableColors, random);
    return {
      ...tower,
      position: [tower.position[0] * posScale, tower.position[1] * posScale] as [
        number,
        number,
      ],
      colorKey: color,
      blocks: [{ width: base.width, depth: base.depth, height }],
    };
  });

  // Decorative monoliths fill the remaining corridor slots: first the gaps in
  // the inner rows, then the outer rows behind them.
  const slots: Array<[number, number]> = [];
  for (const rowX of [-INNER_ROW, INNER_ROW, -OUTER_ROW, OUTER_ROW]) {
    for (let s = 0; s < SLOTS_PER_ROW; s++) {
      const x = rowX * params.tileSize;
      const z = (s - (SLOTS_PER_ROW - 1) / 2) * step;
      const taken = content.some(
        (t) => Math.abs(t.position[0] - x) < step / 2 && Math.abs(t.position[1] - z) < step / 2,
      );
      if (!taken) slots.push([x, z]);
    }
  }

  const decorative: TowerConfig[] = [];
  for (let i = 0; i < count; i++) {
    const slot = slots[i % slots.length];
    const cycle = Math.floor(i / slots.length);
    const seed = hash(`decor:${i}:${cycle}:${params.tileSize}`);
    const random = seededRandom(seed);
    const height = randomInt(random, minH, maxH);
    const size = 7 + Math.floor(random() * 5);
    const color = availableColors[Math.floor(random() * availableColors.length)];
    decorative.push({
      id: `decor-${i}`,
      label: "tower",
      position: [
        slot[0] + (random() - 0.5) * 3,
        slot[1] + (random() - 0.5) * 6,
      ],
      colorKey: color,
      blocks: [{ width: size, depth: size, height }],
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
