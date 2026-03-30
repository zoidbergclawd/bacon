export interface DetectorFinding {
  id: string;
  detectorName: string;
  severity: string;
  message: string;
  file?: string;
  line?: number;
  metadata?: Record<string, unknown>;
}

export interface DetectorContext {
  projectRoot: string;
  options: Record<string, unknown>;
}

export interface Detector {
  name: string;
  description: string;
  run(context: DetectorContext): Promise<DetectorFinding[]>;
}
