import { describe, it, expect } from 'vitest';
import { Spectre } from '../src/index.js';

describe('Spectre', () => {
  it('should initialize', () => {
    const agent = new Spectre();
    expect(agent).toBeDefined();
  });

  it('should exist', () => {
    expect(Spectre).toBeTruthy();
  });
});
