import { describe, expect, it } from "vitest";
import { getHorizontalSwipeDirection } from "@/lib/swipe";

describe("horizontal swipe navigation", () => {
  it("moves forward for a deliberate left swipe", () => {
    expect(getHorizontalSwipeDirection({ offsetX: -72, offsetY: 8 })).toBe(1);
  });

  it("moves backward for a deliberate right swipe", () => {
    expect(getHorizontalSwipeDirection({ offsetX: 64, offsetY: 4 })).toBe(-1);
  });

  it("accepts a short, fast horizontal flick", () => {
    expect(
      getHorizontalSwipeDirection({
        offsetX: -18,
        offsetY: 3,
        velocityX: -720,
        velocityY: 80,
      })
    ).toBe(1);
  });

  it("ignores taps and small horizontal movement", () => {
    expect(getHorizontalSwipeDirection({ offsetX: 10, offsetY: 2, velocityX: 120 })).toBe(0);
  });

  it("preserves vertical page scrolling", () => {
    expect(
      getHorizontalSwipeDirection({
        offsetX: -58,
        offsetY: 96,
        velocityX: -620,
        velocityY: 920,
      })
    ).toBe(0);
  });
});
