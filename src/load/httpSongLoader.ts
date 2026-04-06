/**
 * HTTP loader for static song packs: `{baseUrl}/{songId}/{songId}.dance` (plan Phase 2.1).
 * Same on-disk layout as `public/songs/<id>/`.
 */

export function songChartUrl(baseUrl: string, songId: string): string {
  const b = baseUrl.replace(/\/$/, '');
  return `${b}/${songId}/${songId}.dance`;
}

export async function fetchSongChartHttp(baseUrl: string, songId: string): Promise<string> {
  const url = songChartUrl(baseUrl, songId);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch chart: ${url} (${res.status})`);
  }
  return res.text();
}
