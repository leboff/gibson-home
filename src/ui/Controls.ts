import "./controls.css";
import { PALETTE, type PaletteKey } from "../scene/materials";
import type { FieldParams } from "../config/towers";

type OnChange = (params: FieldParams) => void;

const COLOR_KEYS = Object.keys(PALETTE) as PaletteKey[];

export class Controls {
  private readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private readonly values = new Map<string, HTMLElement>();
  private sliderTimer: number | null = null;
  private state: FieldParams;

  constructor(
    mount: HTMLElement,
    initial: FieldParams,
    private readonly onChange: OnChange,
  ) {
    this.state = cloneParams(initial);

    this.panel = document.createElement("aside");
    this.panel.className = "controls";
    this.panel.setAttribute("aria-label", "Tower controls");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "controls__toggle";
    toggle.setAttribute("aria-label", "Toggle controls");
    const toggleLabel = document.createElement("span");
    toggleLabel.className = "controls__toggle-label";
    toggleLabel.textContent = "Controls";
    toggle.append(toggleLabel);
    // Start minimized.
    toggle.setAttribute("aria-expanded", "false");

    this.body = document.createElement("div");
    this.body.className = "controls__body";
    this.body.hidden = true;

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      const next = !expanded;
      toggle.setAttribute("aria-expanded", String(next));
      this.body.hidden = !next;
    });

    this.body.append(
      this.makeSlider("Decorative towers", "decorativeCount", 0, 24, 1),
      this.makeSlider("Plane size", "tileSize", 60, 200, 1),
      this.makeSlider("Min height", "minHeight", 4, 80, 1),
      this.makeSlider("Max height", "maxHeight", 6, 120, 1),
      this.makeColors(),
    );
    this.renderValues();

    this.panel.append(toggle, this.body);
    mount.append(this.panel);
  }

  private makeSlider(
    label: string,
    key: "decorativeCount" | "tileSize" | "minHeight" | "maxHeight",
    min: number,
    max: number,
    step: number,
  ): HTMLElement {
    const row = document.createElement("label");
    row.className = "controls__row";

    const top = document.createElement("div");
    top.className = "controls__row-top";

    const name = document.createElement("span");
    name.textContent = label;
    const value = document.createElement("span");
    value.className = "controls__value";
    top.append(name, value);
    this.values.set(key, value);

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(this.state[key]);

    input.addEventListener("input", () => {
      this.state[key] = Number(input.value);
      this.normalizeHeights();
      this.renderValues();
      this.emitDebounced();
    });

    row.append(top, input);
    value.textContent = String(this.state[key]);
    return row;
  }

  private makeColors(): HTMLElement {
    const group = document.createElement("fieldset");
    group.className = "controls__colors";
    const legend = document.createElement("legend");
    legend.textContent = "Available colors";
    group.append(legend);

    for (const key of COLOR_KEYS) {
      const id = `color-${key}`;
      const label = document.createElement("label");
      label.className = "controls__chip";
      label.style.setProperty("--chip", PALETTE[key]);
      label.htmlFor = id;

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      input.value = key;
      input.checked = this.state.colors.includes(key);
      input.addEventListener("change", () => {
        if (input.checked) {
          if (!this.state.colors.includes(key)) this.state.colors.push(key);
        } else {
          this.state.colors = this.state.colors.filter((c) => c !== key);
          if (this.state.colors.length === 0) {
            this.state.colors = [key];
            input.checked = true;
          }
        }
        this.emitImmediate();
      });

      const text = document.createElement("span");
      text.textContent = key;
      label.append(input, text);
      group.append(label);
    }

    return group;
  }

  private normalizeHeights(): void {
    if (this.state.minHeight > this.state.maxHeight) {
      this.state.maxHeight = this.state.minHeight;
    }
  }

  private renderValues(): void {
    for (const key of ["decorativeCount", "tileSize", "minHeight", "maxHeight"] as const) {
      const el = this.values.get(key);
      if (el) el.textContent = String(this.state[key]);
    }
  }

  private emitDebounced(): void {
    if (this.sliderTimer !== null) window.clearTimeout(this.sliderTimer);
    this.sliderTimer = window.setTimeout(() => {
      this.emitImmediate();
      this.sliderTimer = null;
    }, 150);
  }

  private emitImmediate(): void {
    this.onChange(cloneParams(this.state));
  }
}

function cloneParams(params: FieldParams): FieldParams {
  return {
    decorativeCount: params.decorativeCount,
    tileSize: params.tileSize,
    minHeight: params.minHeight,
    maxHeight: params.maxHeight,
    colors: [...params.colors],
  };
}
