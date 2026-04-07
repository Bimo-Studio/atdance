import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('P0.2 env documentation', () => {
  it('.env.example mentions VITE_P2P_BOOTSTRAP', () => {
    const p = resolve(process.cwd(), '.env.example');
    const text = readFileSync(p, 'utf8');
    expect(text).toMatch(/VITE_P2P_BOOTSTRAP/);
  });

  it('.env.example keeps VITE_RELAY_WS for legacy Mode A (PRD F4)', () => {
    const p = resolve(process.cwd(), '.env.example');
    const text = readFileSync(p, 'utf8');
    expect(text).toMatch(/VITE_RELAY_WS/);
  });

  it('.env.example documents optional VITE_SYNC_LAB_MODE', () => {
    const p = resolve(process.cwd(), '.env.example');
    const text = readFileSync(p, 'utf8');
    expect(text).toMatch(/VITE_SYNC_LAB_MODE/);
  });
});

describe('P0.2 README env documentation', () => {
  it('README env table documents VITE_P2P_BOOTSTRAP and VITE_RELAY_WS', () => {
    const p = resolve(process.cwd(), 'README.md');
    const text = readFileSync(p, 'utf8');
    expect(text).toMatch(/VITE_P2P_BOOTSTRAP/);
    expect(text).toMatch(/VITE_RELAY_WS/);
  });
});
