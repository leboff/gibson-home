/**
 * Device/perf detection that drives one `quality` tier. The scene reads these
 * flags to decide pixel-ratio caps, antialiasing, bloom, and idle motion.
 */

export interface Capabilities {
  isMobile: boolean;
  prefersReducedMotion: boolean;
  pixelRatioCap: number;
  antialias: boolean;
  /** Whether to run the (expensive) bloom post-processing pass. */
  bloom: boolean;
  /** Bloom resolution scale (1 = full, 0.5 = half) when bloom is enabled. */
  bloomScale: number;
}

export function detectCapabilities(): Capabilities {
  const coarsePointer =
    window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 700;
  const lowCores = (navigator.hardwareConcurrency ?? 8) <= 4;
  const isMobile = coarsePointer && (smallScreen || lowCores);

  const prefersReducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  return {
    isMobile,
    prefersReducedMotion,
    pixelRatioCap: isMobile ? 1.5 : 2,
    antialias: !isMobile,
    // Keep bloom on everywhere (it's the whole look) but downscale on mobile.
    bloom: true,
    bloomScale: isMobile ? 0.5 : 1,
  };
}
