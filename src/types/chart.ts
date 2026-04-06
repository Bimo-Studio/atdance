/**
 * Chart IR (plan Phase 1.1): after `parseDanceFile` + `buildNoteTimeline`, all note times are
 * **seconds** on the song timeline (`NoteEvent.timeSec`), aligned with pydance `Steps` / `toRealTime`.
 */

/** Parsed .dance metadata (string values; coerce in chart layer). */
export type DanceMetadata = Record<string, string>;

export type DanceGameMode = string;

export type DanceStepRow =
  | { type: 'wait'; seconds: number }
  | { type: 'ready' }
  | { type: 'delay'; measures: number }
  | { type: 'bpm'; bpm: number }
  | { type: 'stop'; seconds: number }
  | { type: 'note'; beat: number; panels: readonly number[] }
  /** Parsed but ignored when building note times (lyrics / future commands). */
  | { type: 'lyric'; raw: string };

export interface ParsedDanceChart {
  readonly metadata: DanceMetadata;
  readonly mode: DanceGameMode;
  readonly difficultyName: string;
  readonly difficultyFeet: number;
  readonly rows: readonly DanceStepRow[];
}

/** One arrow / panel hit in song time (seconds). */
export interface NoteEvent {
  readonly timeSec: number;
  /** Panel indices 0–3 (L, D, U, R) with pydance digit semantics (0–7). */
  readonly panels: readonly number[];
}

export interface ChartTimeline {
  readonly metadata: DanceMetadata;
  readonly mode: DanceGameMode;
  readonly difficultyName: string;
  readonly bpm: number;
  readonly gapMs: number;
  readonly noteEvents: readonly NoteEvent[];
}
