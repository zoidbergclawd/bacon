export enum RiskSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface RiskFinding {
  category: string;
  severity: RiskSeverity;
  message: string;
  file?: string;
  line?: number;
  recommendation?: string;
}

export interface RiskDetector {
  analyze(projectPath: string): Promise<RiskFinding[]>;
}
