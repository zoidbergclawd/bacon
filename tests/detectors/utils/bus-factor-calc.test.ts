import { describe, it, expect } from "vitest";
import { calculateBusFactor, BusFactorResult } from "../../../src/detectors/utils/bus-factor-calc";

describe("calculateBusFactor", () => {
  it("returns bus factor of 1 when a single author owns all lines", () => {
    const authorLines = new Map([["Alice", 100]]);
    const result = calculateBusFactor(authorLines, 80);

    expect(result.busFactor).toBe(1);
    expect(result.flagged).toBe(true);
    expect(result.totalLines).toBe(100);
    expect(result.topAuthorPercentage).toBe(100);
  });

  it("returns bus factor of 1 when one author dominates", () => {
    const authorLines = new Map([
      ["Alice", 90],
      ["Bob", 10],
    ]);
    const result = calculateBusFactor(authorLines, 80);

    expect(result.busFactor).toBe(1);
    expect(result.flagged).toBe(true);
    expect(result.topAuthorPercentage).toBe(90);
  });

  it("returns bus factor of 2 when two authors split evenly", () => {
    const authorLines = new Map([
      ["Alice", 50],
      ["Bob", 50],
    ]);
    const result = calculateBusFactor(authorLines, 80);

    expect(result.busFactor).toBe(2);
    expect(result.flagged).toBe(false);
    expect(result.topAuthorPercentage).toBe(50);
  });

  it("flags when top author exceeds threshold", () => {
    const authorLines = new Map([
      ["Alice", 85],
      ["Bob", 15],
    ]);
    const result = calculateBusFactor(authorLines, 80);

    expect(result.flagged).toBe(true);
  });

  it("does not flag when top author is at threshold", () => {
    const authorLines = new Map([
      ["Alice", 80],
      ["Bob", 20],
    ]);
    const result = calculateBusFactor(authorLines, 80);

    expect(result.flagged).toBe(false);
  });

  it("handles empty map", () => {
    const authorLines = new Map<string, number>();
    const result = calculateBusFactor(authorLines, 80);

    expect(result.busFactor).toBe(0);
    expect(result.flagged).toBe(false);
    expect(result.totalLines).toBe(0);
    expect(result.topAuthorPercentage).toBe(0);
  });

  it("handles three authors where two are needed for >50%", () => {
    const authorLines = new Map([
      ["Alice", 40],
      ["Bob", 35],
      ["Carol", 25],
    ]);
    const result = calculateBusFactor(authorLines, 80);

    expect(result.busFactor).toBe(2);
    expect(result.flagged).toBe(false);
    expect(result.totalLines).toBe(100);
  });

  it("respects custom threshold", () => {
    const authorLines = new Map([
      ["Alice", 60],
      ["Bob", 40],
    ]);

    expect(calculateBusFactor(authorLines, 50).flagged).toBe(true);
    expect(calculateBusFactor(authorLines, 70).flagged).toBe(false);
  });
});
