/**
 * Passed to {@link PlayScene} via `scene.start('PlayScene', data)`.
 */
export interface PlaySceneData {
  /** Use embedded minimal chart (no fetch). */
  useMinimal?: boolean;
  /** Fetch path for `.dance` text (e.g. `/songs/synrg/synrg.dance`). */
  chartUrl?: string;
  /** Index into `parseDanceFile` `charts[]` (multi-`SINGLE` files). */
  chartIndex?: number;
  /** Load chart (and optional audio) via WebTorrent; on failure uses `chartUrl` HTTP fallback. */
  magnetUri?: string;
  /** Magnet load timeout (ms); default 45s. */
  torrentTimeoutMs?: number;
}
