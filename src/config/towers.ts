import type { TowerConfig } from "../types";

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

export const TOWERS: TowerConfig[] = [
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

  // ---- Decorative skyline towers (no hotspots) ----
  { id: "d1", label: "tower", position: [-40, 14], colorKey: "blue", blocks: [{ width: 6, depth: 6, height: 22 }, { width: 4, depth: 4, height: 9 }] },
  { id: "d2", label: "tower", position: [-18, 38], colorKey: "cyan", blocks: [{ width: 5, depth: 5, height: 9 }] },
  { id: "d3", label: "tower", position: [12, -8], colorKey: "blue", blocks: [{ width: 7, depth: 7, height: 26 }, { width: 4, depth: 4, height: 12 }, { width: 2, depth: 2, height: 8 }] },
  { id: "d4", label: "tower", position: [40, -8], colorKey: "violet", blocks: [{ width: 6, depth: 6, height: 15 }] },
  { id: "d5", label: "tower", position: [-38, -40], colorKey: "magenta", blocks: [{ width: 8, depth: 8, height: 11 }, { width: 5, depth: 5, height: 7 }] },
  { id: "d6", label: "tower", position: [8, -42], colorKey: "amber", blocks: [{ width: 5, depth: 5, height: 20 }, { width: 3, depth: 3, height: 10 }] },
  { id: "d7", label: "tower", position: [-12, -8], colorKey: "green", blocks: [{ width: 4, depth: 4, height: 7 }] },
  { id: "d8", label: "tower", position: [38, 40], colorKey: "blue", blocks: [{ width: 6, depth: 6, height: 17 }, { width: 4, depth: 4, height: 8 }] },
];
