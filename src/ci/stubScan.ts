/**
 * Mechanical stub scan per `docs/process-feature-delivery.md` §166–175.
 * Fails on TODO / FIXME / TBD / "not implemented" in non-test TypeScript under `src/` and `relay/src/`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Line-level pattern: word-boundary markers or phrase (any case). */
const STUB_LINE_RE = /\b(TODO|FIXME|TBD)\b|not implemented/i;

export function lineViolatesStubScan(line: string): boolean {
  return STUB_LINE_RE.test(line);
}

function isScannableTsFile(path: string): boolean {
  if (!path.endsWith('.ts')) {
    return false;
  }
  if (path.endsWith('.test.ts') || path.endsWith('.d.ts')) {
    return false;
  }
  return true;
}

function walkTsFiles(dir: string, root: string, out: string[]): void {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      walkTsFiles(p, root, out);
    } else if (ent.isFile() && isScannableTsFile(p)) {
      out.push(p);
    }
  }
}

/** Self-file exempt: regex and user-facing log lines intentionally mention the same markers this tool forbids. */
const EXEMPT_STUB_SCAN_TOOL = new Set(['src/ci/stubScan.ts']);

export function violationsInSource(cwd: string): { file: string; line: number; text: string }[] {
  const roots = [join(cwd, 'src'), join(cwd, 'relay', 'src')].filter((r) => {
    try {
      readdirSync(r);
      return true;
    } catch {
      return false;
    }
  });

  const files: string[] = [];
  for (const r of roots) {
    walkTsFiles(r, r, files);
  }

  const hits: { file: string; line: number; text: string }[] = [];
  for (const file of files) {
    const rel = relative(cwd, file).split('\\').join('/');
    if (EXEMPT_STUB_SCAN_TOOL.has(rel)) {
      continue;
    }
    const text = readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line !== undefined && lineViolatesStubScan(line)) {
        hits.push({ file: rel, line: i + 1, text: line.trim() });
      }
    }
  }
  return hits;
}

/** Normative “production PvP stub” markers — see `docs/tasks-pvp-real-sync.md` extended audit. */
const AUDIT_LINE_RE = /\b(beginStubPlay|STUB_PEER_DID|MockPvpRemote)\b/;

export function auditPvpStubPatternsInScenes(
  cwd: string,
): { file: string; line: number; text: string }[] {
  const scenesDir = join(cwd, 'src', 'scenes');
  const hits: { file: string; line: number; text: string }[] = [];
  try {
    const files: string[] = [];
    walkTsFiles(scenesDir, scenesDir, files);
    for (const file of files) {
      const rel = relative(cwd, file).split('\\').join('/');
      const text = readFileSync(file, 'utf8');
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (line !== undefined && AUDIT_LINE_RE.test(line)) {
          hits.push({ file: rel, line: i + 1, text: line.trim() });
        }
      }
    }
  } catch {
    /* no scenes dir */
  }
  return hits;
}

function main(): void {
  const cwd = process.cwd();
  if (process.argv.includes('--audit')) {
    const a = auditPvpStubPatternsInScenes(cwd);
    if (a.length === 0) {
      console.info('stub-scan:audit OK (no PvP stub markers in src/scenes)');
      process.exit(0);
    }
    console.error('stub-scan:audit PvP stub markers in scenes (docs/tasks-pvp-real-sync.md):\n');
    for (const h of a) {
      console.error(`  ${h.file}:${h.line}: ${h.text}`);
    }
    console.error(`\nTotal: ${a.length}`);
    process.exit(1);
  }

  const hits = violationsInSource(cwd);
  if (hits.length === 0) {
    console.info('stub-scan: OK (no TODO|FIXME|TBD|not implemented in non-test src)');
    process.exit(0);
  }
  console.error('stub-scan: forbidden markers in production TypeScript:\n');
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}: ${h.text}`);
  }
  console.error(`\nTotal: ${hits.length} (see docs/process-feature-delivery.md §Stub scan)`);
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
