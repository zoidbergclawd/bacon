import { DependencyRiskDetector } from './detectors/DependencyRiskDetector.js';
import { FileRotDetector } from './detectors/FileRotDetector.js';
import { RiskDetector, RiskFinding } from './types.js';

export class Spectre {
  private detectors: RiskDetector[];

  constructor() {
    this.detectors = [
      new DependencyRiskDetector(),
      new FileRotDetector()
    ];
  }

  async audit(projectPath: string): Promise<{ findings: RiskFinding[] }> {
    const findings: RiskFinding[] = [];
    
    for (const detector of this.detectors) {
      const detectorFindings = await detector.analyze(projectPath);
      findings.push(...detectorFindings);
    }
    
    return { findings };
  }
}
