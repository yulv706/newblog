import { describe, it, expect } from "vitest";
import {
  APPLE_EASE,
  FADE_IN_VARIANTS,
  STAGGER_CONTAINER_VARIANTS,
  STAGGER_ITEM_VARIANTS,
  CARD_HOVER_VARIANTS,
} from "@/components/ui/animations";

describe("Animation constants", () => {
  it("exports Apple easing curve [0.22, 1, 0.36, 1]", () => {
    expect(APPLE_EASE).toEqual([0.22, 1, 0.36, 1]);
  });
});

describe("Fade-in animation variants", () => {
  it("has hidden state with opacity 0 and y 20", () => {
    expect(FADE_IN_VARIANTS.hidden).toEqual({ opacity: 0, y: 20 });
  });

  it("has visible state with opacity 1 and y 0", () => {
    const visible = FADE_IN_VARIANTS.visible;
    expect(visible).toHaveProperty("opacity", 1);
    expect(visible).toHaveProperty("y", 0);
  });

  it("visible state uses Apple easing and duration < 500ms", () => {
    const visible = FADE_IN_VARIANTS.visible as unknown as {
      opacity: number;
      y: number;
      transition: { duration: number; ease: number[] };
    };
    expect(visible.transition.ease).toEqual([0.22, 1, 0.36, 1]);
    expect(visible.transition.duration).toBeLessThanOrEqual(0.5);
    expect(visible.transition.duration).toBeGreaterThan(0);
  });
});

describe("Stagger container variants", () => {
  it("has hidden and visible states", () => {
    expect(STAGGER_CONTAINER_VARIANTS).toHaveProperty("hidden");
    expect(STAGGER_CONTAINER_VARIANTS).toHaveProperty("visible");
  });

  it("visible state staggers children with 100ms (0.1s) delay", () => {
    const visible = STAGGER_CONTAINER_VARIANTS.visible as unknown as {
      transition: { staggerChildren: number };
    };
    expect(visible.transition.staggerChildren).toBe(0.1);
  });
});

describe("Stagger item variants", () => {
  it("has hidden state with opacity 0 and y offset", () => {
    expect(STAGGER_ITEM_VARIANTS.hidden).toHaveProperty("opacity", 0);
    expect(STAGGER_ITEM_VARIANTS.hidden).toHaveProperty("y", 20);
  });

  it("has visible state with opacity 1 and y 0", () => {
    const visible = STAGGER_ITEM_VARIANTS.visible as unknown as {
      opacity: number;
      y: number;
      transition: { duration: number; ease: number[] };
    };
    expect(visible.opacity).toBe(1);
    expect(visible.y).toBe(0);
  });

  it("visible state uses Apple easing", () => {
    const visible = STAGGER_ITEM_VARIANTS.visible as unknown as {
      transition: { ease: number[] };
    };
    expect(visible.transition.ease).toEqual([0.22, 1, 0.36, 1]);
  });
});

describe("Card hover variants", () => {
  it("has rest state with y 0 and base shadow", () => {
    expect(CARD_HOVER_VARIANTS.rest).toHaveProperty("y", 0);
    expect(CARD_HOVER_VARIANTS.rest).toHaveProperty("transition");
  });

  it("has hover state with translateY -4px and increased shadow", () => {
    expect(CARD_HOVER_VARIANTS.hover).toHaveProperty("y", -4);
    expect(CARD_HOVER_VARIANTS.hover).toHaveProperty("transition");
  });

  it("hover state uses Apple easing", () => {
    const hover = CARD_HOVER_VARIANTS.hover as unknown as {
      transition: { ease: number[]; duration: number };
    };
    expect(hover.transition.ease).toEqual([0.22, 1, 0.36, 1]);
    expect(hover.transition.duration).toBeLessThanOrEqual(0.5);
  });

  it("rest state uses Apple easing", () => {
    const rest = CARD_HOVER_VARIANTS.rest as unknown as {
      transition: { ease: number[]; duration: number };
    };
    expect(rest.transition.ease).toEqual([0.22, 1, 0.36, 1]);
  });
});
