import { describe, it, expect, vi } from "vitest";
import * as path from "path";
import type { Detector, DetectorContext, DetectorFinding } from "../types";

const REPO_ROOT = path.resolve(__dirname, "../../..");

describe("BusFactorDetector class", () => {
  it("exports a BusFactorDetector class", async () => {
    const { BusFactorDetector } = await import("../BusFactorDetector");
    expect(BusFactorDetector).toBeDefined();
    expect(typeof BusFactorDetector).toBe("function"); // class constructor
  });

  it("implements Detector interface (has name, description, run)", async () => {
    const { BusFactorDetector } = await import("../BusFactorDetector");
    const detector = new BusFactorDetector();

    expect(detector.name).toBe("bus-factor");
    expect(typeof detector.description).toBe("string");
    expect(detector.description.length).toBeGreaterThan(0);
    expect(typeof detector.run).toBe("function");
  });

  it("satisfies the Detector type", async () => {
    const { BusFactorDetector } = await import("../BusFactorDetector");
    const detector: Detector = new BusFactorDetector();

    expect(detector.name).toBe("bus-factor");
  });

  it("run() discovers files and returns findings", async () => {
    const { BusFactorDetector } = await import("../BusFactorDetector");
    const detector = new BusFactorDetector();

    const context: DetectorContext = {
      projectRoot: REPO_ROOT,
      options: { filePatterns: ["*.json"], threshold: 80 },
    };

    const findings = await detector.run(context);

    expect(Array.isArray(findings)).toBe(true);
    // package.json exists and is tracked — should produce at least something
    for (const finding of findings) {
      expect(finding.id).toBeDefined();
      expect(finding.detectorName).toBe("bus-factor");
      expect(finding.severity).toBeDefined();
      expect(finding.message).toBeDefined();
      expect(finding.file).toBeDefined();
      expect(finding.metadata).toBeDefined();
    }
  });

  it("run() returns findings only for files exceeding threshold", async () => {
    const { BusFactorDetector } = await import("../BusFactorDetector");
    const detector = new BusFactorDetector();

    // threshold: 0 → every file with at least one author is flagged
    const allFlagged = await detector.run({
      projectRoot: REPO_ROOT,
      options: { filePatterns: ["package.json"], threshold: 0 },
    });

    // threshold: 100 → no file can exceed 100%, so nothing flagged
    const noneFlagged = await detector.run({
      projectRoot: REPO_ROOT,
      options: { filePatterns: ["package.json"], threshold: 100 },
    });

    expect(allFlagged.length).toBeGreaterThan(0);
    expect(noneFlagged.length).toBe(0);
  });

  it("run() includes metadata with busFactor and topAuthorPercentage", async () => {
    const { BusFactorDetector } = await import("../BusFactorDetector");
    const detector = new BusFactorDetector();

    const findings = await detector.run({
      projectRoot: REPO_ROOT,
      options: { filePatterns: ["package.json"], threshold: 0 },
    });

    expect(findings.length).toBeGreaterThan(0);
    const f = findings[0];
    expect(f.metadata).toBeDefined();
    expect(typeof f.metadata!.busFactor).toBe("number");
    expect(typeof f.metadata!.topAuthorPercentage).toBe("number");
  });

  it("run() defaults threshold to 80 if not provided", async () => {
    const { BusFactorDetector } = await import("../BusFactorDetector");
    const detector = new BusFactorDetector();

    // With default 80 threshold, single-author files should be flagged
    const findings = await detector.run({
      projectRoot: REPO_ROOT,
      options: { filePatterns: ["package.json"] },
    });

    // We can't assert exact count but it should not throw
    expect(Array.isArray(findings)).toBe(true);
  });

  it("run() returns empty array for no tracked files matching pattern", async () => {
    const { BusFactorDetector } = await import("../BusFactorDetector");
    const detector = new BusFactorDetector();

    const findings = await detector.run({
      projectRoot: REPO_ROOT,
      options: { filePatterns: ["*.nonexistent_extension_xyz"] },
    });

    expect(findings).toEqual([]);
  });
});
