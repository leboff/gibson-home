import { CONTENT_TOWERS } from "../config/towers";

/**
 * Builds a visually-hidden (but focusable) text list of every hotspot link from
 * the same config that drives the 3D scene. Guarantees the page is usable with
 * WebGL off, with a screen reader, or without touching the canvas.
 *
 * Links with no URL render as disabled placeholders, mirroring the scene.
 */
export function buildA11yFallback(nav: HTMLElement): void {
  const heading = document.createElement("h2");
  heading.textContent = "Site links";
  nav.append(heading);

  const list = document.createElement("ul");

  for (const tower of CONTENT_TOWERS) {
    for (const hotspot of tower.hotspots ?? []) {
      const li = document.createElement("li");
      const url = hotspot.link.url.trim();
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.textContent = hotspot.link.title;
        li.append(a);
      } else {
        const a = document.createElement("a");
        a.setAttribute("aria-disabled", "true");
        a.setAttribute("role", "link");
        a.tabIndex = 0;
        a.textContent = `${hotspot.link.title} (coming soon)`;
        li.append(a);
      }
      list.append(li);
    }
  }

  nav.append(list);
}
