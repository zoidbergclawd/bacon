import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { DependencyRiskDetector } from '../../src/detectors/DependencyRiskDetector.js';
import { RiskSeverity } from '../../src/types.js';

describe('DependencyRiskDetector', () => {
  it('detects high-risk dependencies (deprecated/abandoned)', async () => {
    const fixturePath = path.resolve(__dirname, '../fixtures/risky-project');
    const detector = new DependencyRiskDetector();
    
    const findings = await detector.analyze(fixturePath);
    
    // Expect 'request' to be flagged (deprecated)
    const requestFinding = findings.find(f => f.message.includes('request'));
    expect(requestFinding).toBeDefined();
    expect(requestFinding?.severity).toBe(RiskSeverity.HIGH);
    expect(requestFinding?.category).toBe('Dependency Health');
    
    // Expect 'left-pad' to be flagged (legacy risk)
    const leftPadFinding = findings.find(f => f.message.includes('left-pad'));
    expect(leftPadFinding).toBeDefined();
    expect(leftPadFinding?.severity).toBe(RiskSeverity.MEDIUM);
  });
});
