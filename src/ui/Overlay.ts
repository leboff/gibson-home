import "./overlay.css";
import type { Hotspot } from "../types";
import { PALETTE, type PaletteKey } from "../scene/materials";

/**
 * Accessible hotspot detail dialog. Shows the link's title/description and a
 * "Visit" action that is disabled while the link has no URL (placeholder mode);
 * filling in `link.url` turns it into a real anchor with no code change.
 *
 * Manages a focus trap and restores focus to the previously focused element on
 * close.
 */
export class Overlay {
  private readonly root: HTMLElement;
  private readonly card: HTMLElement;
  private readonly eyebrow: HTMLElement;
  private readonly title: HTMLElement;
  private readonly desc: HTMLElement;
  private readonly actions: HTMLElement;
  private readonly closeBtn: HTMLButtonElement;

  private open = false;
  private previousFocus: HTMLElement | null = null;
  private onCloseCallback?: () => void;

  constructor(mount: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "overlay";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");
    this.root.setAttribute("aria-labelledby", "overlay-title");
    this.root.setAttribute("aria-describedby", "overlay-desc");
    this.root.hidden = true;

    this.card = document.createElement("div");
    this.card.className = "overlay__card";

    this.eyebrow = document.createElement("p");
    this.eyebrow.className = "overlay__eyebrow";

    this.title = document.createElement("h2");
    this.title.className = "overlay__title";
    this.title.id = "overlay-title";

    this.desc = document.createElement("p");
    this.desc.className = "overlay__desc";
    this.desc.id = "overlay-desc";

    this.actions = document.createElement("div");
    this.actions.className = "overlay__actions";

    this.closeBtn = document.createElement("button");
    this.closeBtn.type = "button";
    this.closeBtn.className = "overlay__close";
    this.closeBtn.textContent = "Close";
    this.closeBtn.addEventListener("click", () => this.hide());

    this.card.append(this.eyebrow, this.title, this.desc, this.actions);
    this.root.append(this.card);
    mount.append(this.root);

    // Click on the backdrop (outside the card) closes.
    this.root.addEventListener("pointerdown", (e) => {
      if (e.target === this.root) this.hide();
    });
    this.root.addEventListener("keydown", this.handleKeydown);
  }

  get isOpen(): boolean {
    return this.open;
  }

  onClose(cb: () => void): void {
    this.onCloseCallback = cb;
  }

  show(hotspot: Hotspot, towerLabel: string, accentColor?: PaletteKey | string): void {
    const accent = resolveAccent(accentColor ?? hotspot.accentColor);
    this.card.style.setProperty("--accent", accent);

    this.eyebrow.textContent = towerLabel;
    this.title.textContent = hotspot.link.title;
    this.desc.textContent = hotspot.link.description;

    // Rebuild the action row (visit button state depends on link.url).
    this.actions.replaceChildren();
    const url = hotspot.link.url.trim();
    if (url) {
      const visit = document.createElement("a");
      visit.className = "overlay__visit";
      visit.href = url;
      visit.textContent = "Visit";
      visit.rel = "noopener";
      this.actions.append(visit);
    } else {
      const visit = document.createElement("button");
      visit.type = "button";
      visit.className = "overlay__visit";
      visit.textContent = "Visit (coming soon)";
      visit.disabled = true;
      visit.setAttribute("aria-disabled", "true");
      this.actions.append(visit);
    }
    this.actions.append(this.closeBtn);

    this.previousFocus = document.activeElement as HTMLElement | null;
    this.root.hidden = false;
    // Force reflow so the CSS transition runs from the hidden state.
    void this.root.offsetWidth;
    this.root.classList.add("is-open");
    this.open = true;

    // Move focus into the dialog.
    const first = this.focusable()[0] ?? this.closeBtn;
    first.focus();
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.root.classList.remove("is-open");
    this.root.hidden = true;
    this.previousFocus?.focus();
    this.onCloseCallback?.();
  }

  private focusable(): HTMLElement[] {
    return Array.from(
      this.card.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    if (!this.open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      this.hide();
      return;
    }
    if (e.key !== "Tab") return;

    // Trap focus within the card.
    const items = this.focusable();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };
}

function resolveAccent(key?: string): string {
  if (!key) return PALETTE.cyan;
  return (PALETTE as Record<string, string>)[key] ?? key;
}
