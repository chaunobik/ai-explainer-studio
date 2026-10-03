import {describe, expect, it} from "vitest";
import {windowOpacity} from "./fade";

describe("windowOpacity", () => {
  it("handles windows shorter than the preferred fade duration", () => {
    const values = [0, 0.5, 1, 1.5, 2, 2.5, 3].map((frame) =>
      windowOpacity(frame, 0, 3, 5),
    );

    expect(values.every((value) => Number.isFinite(value))).toBe(true);
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(values[0]).toBe(0);
    expect(values.at(-1)).toBe(0);
    expect(values.some((value) => value === 1)).toBe(true);
  });

  it("returns zero for invalid or empty windows", () => {
    expect(windowOpacity(0, 1, 1, 4)).toBe(0);
    expect(windowOpacity(-1, 0, 2, 4)).toBe(0);
    expect(windowOpacity(3, 0, 2, 4)).toBe(0);
  });
});
