import fs from 'node:fs';
import path from 'node:path';
import { RiskDetector, RiskFinding, RiskSeverity } from '../types.js';

export class DependencyRiskDetector implements RiskDetector {
  async analyze(projectPath: string): Promise<RiskFinding[]> {
    const findings: RiskFinding[] = [];
    
    // Check package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return findings;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = packageJson.dependencies || {};

    // Check for deprecated or high-risk packages
    if (dependencies.request) {
      findings.push({
        category: 'Dependency Health',
        severity: RiskSeverity.HIGH,
        message: 'High risk: `request` is deprecated.',
        file: 'package.json',
        line: 1, // Simplified
        recommendation: 'Replace with `fetch`, `axios`, or `ky`.'
      });
    }

    if (dependencies['left-pad']) {
        findings.push({
          category: 'Dependency Health',
          severity: RiskSeverity.MEDIUM,
          message: 'Medium risk: `left-pad` is deprecated and can break builds.',
          file: 'package.json',
          line: 1,
          recommendation: 'Replace with string padding built-ins.'
        });
    }

    return findings;
  }
}
