import { describe, expect, it } from 'vitest';

import {
  assertNoPnpmVersionConflictInWorkflows,
  pnpmActionHasExplicitVersion,
} from './pnpmWorkflowConflict';

describe('pnpmActionHasExplicitVersion', () => {
  it('returns false when version is not set under pnpm/action-setup', () => {
    const yml = `
jobs:
  check:
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v5
      - uses: actions/setup-node@v6
        with:
          node-version: '22'
`;
    expect(pnpmActionHasExplicitVersion(yml)).toBe(false);
  });

  it('returns true when version is set under pnpm/action-setup with', () => {
    const yml = `
jobs:
  check:
    steps:
      - uses: pnpm/action-setup@v4
        with:
          version: 8
`;
    expect(pnpmActionHasExplicitVersion(yml)).toBe(true);
  });

  it('ignores node-version on setup-node (different action)', () => {
    const yml = `
      - uses: actions/setup-node@v6
        with:
          node-version: '22'
`;
    expect(pnpmActionHasExplicitVersion(yml)).toBe(false);
  });
});

describe('assertNoPnpmVersionConflictInWorkflows', () => {
  it('passes for this repo workflows and packageManager', () => {
    expect(() => assertNoPnpmVersionConflictInWorkflows(process.cwd())).not.toThrow();
  });
});
