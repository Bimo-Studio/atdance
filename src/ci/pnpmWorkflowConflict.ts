import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * True when a workflow uses pnpm/action-setup with an explicit `version:` under `with:`.
 * That conflicts with `packageManager` in package.json (pnpm/action-setup and Corepack both enforce one source of truth).
 */
export function pnpmActionHasExplicitVersion(workflowText: string): boolean {
  const lines = workflowText.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) {
      break;
    }
    if (!/^\s*-\s+uses:\s+pnpm\/action-setup@/.test(line)) {
      i++;
      continue;
    }
    const stepIndent = line.match(/^(\s*)-\s/)?.[1]?.length ?? 0;
    i++;
    let inWith = false;
    let withIndent = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (l === undefined) {
        break;
      }
      const indent = l.match(/^(\s*)/)?.[1]?.length ?? 0;
      const trimmed = l.trim();
      if (trimmed.startsWith('-') && indent === stepIndent) {
        break;
      }
      if (trimmed === 'with:' && indent > stepIndent) {
        inWith = true;
        withIndent = indent;
        i++;
        continue;
      }
      if (inWith && indent > withIndent && /^version:\s/.test(trimmed)) {
        return true;
      }
      if (inWith && indent <= withIndent && trimmed !== '') {
        inWith = false;
      }
      i++;
    }
  }
  return false;
}

export function assertNoPnpmVersionConflictInWorkflows(rootDir: string): void {
  const pkgPath = join(rootDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { packageManager?: string };
  if (!pkg.packageManager?.startsWith('pnpm@')) {
    return;
  }
  const workflowsDir = join(rootDir, '.github/workflows');
  if (!existsSync(workflowsDir)) {
    return;
  }
  for (const f of readdirSync(workflowsDir)) {
    if (!f.endsWith('.yml') && !f.endsWith('.yaml')) {
      continue;
    }
    const text = readFileSync(join(workflowsDir, f), 'utf8');
    if (pnpmActionHasExplicitVersion(text)) {
      throw new Error(
        `${f}: pnpm/action-setup sets "version" while package.json has "packageManager". Remove the "version" key from the workflow "with" block so pnpm uses packageManager (avoids ERR_PNPM_BAD_PM_VERSION).`,
      );
    }
  }
}
