import { describe, expect, it } from "vitest";
import {
  APPLE_EASE,
  getPageTransitionProps,
} from "@/components/layout/page-transition";

describe("getPageTransitionProps", () => {
  it("keeps fade transition when reduced motion is disabled", () => {
    const props = getPageTransitionProps(false);

    expect(props.initial).toEqual({ opacity: 0, y: 8 });
    expect(props.animate).toEqual({ opacity: 1, y: 0 });
    expect(props.transition).toEqual({
      duration: 0.3,
      ease: APPLE_EASE,
    });
  });

  it("disables motion when reduced motion is enabled", () => {
    const props = getPageTransitionProps(true);

    expect(props.initial).toBe(false);
    expect(props.animate).toEqual({ opacity: 1, y: 0 });
    expect(props.transition).toEqual({ duration: 0 });
  });
});
