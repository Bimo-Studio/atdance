import { ParseError } from '@/chart/dance/parseError';
import { parseStepLine } from '@/chart/dance/parseStepLine';
import type { DanceMetadata, DanceStepRow, ParsedDanceChart } from '@/types/chart';

const SECTION_HEADERS = new Set(['DESCRIPTION', 'LYRICS', 'BACKGROUND']);

export { ParseError };

function stripComments(line: string): string {
  const hash = line.indexOf('#');
  return hash === -1 ? line : line.slice(0, hash).trimEnd();
}

interface LineWithNo {
  readonly text: string;
  readonly lineNo: number;
}

/** Non-empty lines after comment strip; `lineNo` is 1-based in the original source. */
function splitNonEmptyLines(source: string): LineWithNo[] {
  const out: LineWithNo[] = [];
  const rawLines = source.split(/\r?\n/);
  for (let i = 0; i < rawLines.length; i++) {
    const lineNo = i + 1;
    const stripped = stripComments(rawLines[i] ?? '').trim();
    if (stripped.length > 0) {
      out.push({ text: stripped, lineNo });
    }
  }
  return out;
}

function parseMetadata(
  lines: readonly LineWithNo[],
  start: number,
): { metadata: DanceMetadata; next: number } {
  const metadata: DanceMetadata = {};
  let i = start;
  for (; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.text === 'end') {
      return { metadata, next: i + 1 };
    }
    const sp = line.text.indexOf(' ');
    const key = sp === -1 ? line.text : line.text.slice(0, sp);
    const value = sp === -1 ? '' : line.text.slice(sp + 1).trim();
    metadata[key] = value;
  }
  const last = lines.length > 0 ? lines[lines.length - 1] : undefined;
  throw new ParseError(last?.lineNo ?? 1, 'Unterminated metadata section (missing end)');
}

function skipSection(lines: readonly LineWithNo[], start: number): number {
  let i = start;
  while (i < lines.length && lines[i]?.text !== 'end') {
    i++;
  }
  if (i < lines.length && lines[i]?.text === 'end') {
    return i + 1;
  }
  const last = lines.length > 0 ? lines[lines.length - 1] : undefined;
  throw new ParseError(last?.lineNo ?? 1, 'Unterminated section (missing end)');
}

function parseOneChart(
  lines: readonly LineWithNo[],
  start: number,
  fileMetadata: DanceMetadata,
): { chart: ParsedDanceChart; next: number } {
  let i = start;
  if (i >= lines.length) {
    const last = lines.length > 0 ? lines[lines.length - 1] : undefined;
    throw new ParseError(last?.lineNo ?? 1, 'Expected game mode');
  }
  const modeLine = lines[i];
  if (modeLine === undefined) {
    const last = lines.length > 0 ? lines[lines.length - 1] : undefined;
    throw new ParseError(last?.lineNo ?? 1, 'Expected game mode');
  }
  const mode = modeLine.text;
  i++;
  if (i >= lines.length) {
    const last = lines.length > 0 ? lines[lines.length - 1] : undefined;
    throw new ParseError(last?.lineNo ?? 1, 'Expected difficulty line');
  }
  const diffLine = lines[i];
  if (diffLine === undefined) {
    const last = lines.length > 0 ? lines[lines.length - 1] : undefined;
    throw new ParseError(last?.lineNo ?? 1, 'Expected difficulty line');
  }
  const diffParts = diffLine.text.split(/\s+/).filter(Boolean);
  const difficultyName = diffParts[0];
  const feetRaw = diffParts[1];
  if (difficultyName === undefined || feetRaw === undefined) {
    throw new ParseError(diffLine.lineNo, `Invalid difficulty line: ${diffLine.text}`);
  }
  const difficultyFeet = Number.parseInt(feetRaw, 10);
  if (Number.isNaN(difficultyFeet)) {
    throw new ParseError(diffLine.lineNo, `Invalid difficulty feet: ${diffLine.text}`);
  }
  i++;

  const rows: DanceStepRow[] = [];
  while (i < lines.length && lines[i]?.text !== 'end') {
    const stepLine = lines[i]!;
    if (/^L\s/.test(stepLine.text)) {
      rows.push({ type: 'lyric', raw: stepLine.text });
    } else {
      try {
        rows.push(parseStepLine(stepLine.text));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new ParseError(stepLine.lineNo, msg);
      }
    }
    i++;
  }
  if (i >= lines.length || lines[i]?.text !== 'end') {
    const last = lines.length > 0 ? lines[lines.length - 1] : undefined;
    throw new ParseError(last?.lineNo ?? 1, 'Missing end after step sequence');
  }
  i++;

  return {
    chart: {
      metadata: fileMetadata,
      mode,
      difficultyName,
      difficultyFeet,
      rows,
    },
    next: i,
  };
}

/**
 * Parse a full .dance file: metadata plus one or more step sections.
 */
export function parseDanceFile(source: string): {
  metadata: DanceMetadata;
  charts: readonly ParsedDanceChart[];
} {
  const lines = splitNonEmptyLines(source);
  const { metadata, next } = parseMetadata(lines, 0);
  const charts: ParsedDanceChart[] = [];
  let i = next;

  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) {
      break;
    }
    if (SECTION_HEADERS.has(line.text)) {
      i = skipSection(lines, i + 1);
      continue;
    }
    const { chart, next: after } = parseOneChart(lines, i, metadata);
    charts.push(chart);
    i = after;
  }

  if (charts.length === 0) {
    const last = lines.length > 0 ? lines[lines.length - 1] : undefined;
    throw new ParseError(last?.lineNo ?? 1, 'No charts found after metadata');
  }

  return { metadata, charts };
}
