import { describe, it, expect, expectTypeOf } from "vitest";
import type {
  DetectorFinding,
  DetectorContext,
  Detector,
} from "../types";

describe("DetectorFinding", () => {
  it("requires mandatory fields", () => {
    const finding: DetectorFinding = {
      id: "bf-001",
      detectorName: "bus-factor",
      severity: "high",
      message: "Single author owns 95% of file",
    };

    expect(finding.id).toBe("bf-001");
    expect(finding.detectorName).toBe("bus-factor");
    expect(finding.severity).toBe("high");
    expect(finding.message).toBe("Single author owns 95% of file");
  });

  it("supports optional fields", () => {
    const finding: DetectorFinding = {
      id: "bf-002",
      detectorName: "bus-factor",
      severity: "medium",
      message: "Two authors cover 80%",
      file: "src/index.ts",
      line: 42,
      metadata: { busFactor: 2 },
    };

    expect(finding.file).toBe("src/index.ts");
    expect(finding.line).toBe(42);
    expect(finding.metadata).toEqual({ busFactor: 2 });
  });

  it("allows undefined for optional fields", () => {
    const finding: DetectorFinding = {
      id: "bf-003",
      detectorName: "bus-factor",
      severity: "low",
      message: "Healthy distribution",
    };

    expect(finding.file).toBeUndefined();
    expect(finding.line).toBeUndefined();
    expect(finding.metadata).toBeUndefined();
  });
});

describe("DetectorContext", () => {
  it("requires projectRoot and options", () => {
    const context: DetectorContext = {
      projectRoot: "/tmp/my-project",
      options: {},
    };

    expect(context.projectRoot).toBe("/tmp/my-project");
    expect(context.options).toEqual({});
  });

  it("allows arbitrary options", () => {
    const context: DetectorContext = {
      projectRoot: "/tmp/my-project",
      options: { threshold: 80, filePatterns: ["*.ts"] },
    };

    expect(context.options).toEqual({ threshold: 80, filePatterns: ["*.ts"] });
  });
});

describe("Detector", () => {
  it("has name, description, and async run method", async () => {
    const mockDetector: Detector = {
      name: "test-detector",
      description: "A test detector",
      run: async (context: DetectorContext): Promise<DetectorFinding[]> => {
        return [
          {
            id: "test-001",
            detectorName: "test-detector",
            severity: "info",
            message: `Scanned ${context.projectRoot}`,
          },
        ];
      },
    };

    expect(mockDetector.name).toBe("test-detector");
    expect(mockDetector.description).toBe("A test detector");

    const findings = await mockDetector.run({
      projectRoot: "/tmp/test",
      options: {},
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe("test-001");
    expect(findings[0].message).toBe("Scanned /tmp/test");
  });

  it("run returns a promise of DetectorFinding[]", async () => {
    const detector: Detector = {
      name: "empty",
      description: "Returns nothing",
      run: async () => [],
    };

    const result = await detector.run({ projectRoot: ".", options: {} });
    expect(result).toEqual([]);
    expectTypeOf(result).toEqualTypeOf<DetectorFinding[]>();
  });
});
