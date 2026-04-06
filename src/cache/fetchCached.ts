import { decodeAudioArrayBuffer } from '@/audio/decodeAudio';
import { fetchAudioArrayBufferForDecode } from '@/audio/audioFetchMain';
import { get, set } from 'idb-keyval';

const CACHE_VER = 'v1';

function textKey(url: string): string {
  return `${CACHE_VER}:text:${url}`;
}

function bufferKey(url: string): string {
  return `${CACHE_VER}:buf:${url}`;
}

/**
 * Fetch `.dance` text with IndexedDB cache (idb-keyval).
 */
export async function fetchChartTextCached(url: string): Promise<string> {
  const cached = await get<string>(textKey(url));
  if (cached !== undefined) {
    return cached;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch chart: ${url} (${res.status})`);
  }
  const text = await res.text();
  await set(textKey(url), text);
  return text;
}

/**
 * Decode audio from URL with IndexedDB cache of raw bytes (decode is still per AudioContext).
 */
export async function decodeAudioFromUrlCached(
  ctx: AudioContext,
  url: string,
): Promise<AudioBuffer> {
  const cached = await get<ArrayBuffer>(bufferKey(url));
  if (cached !== undefined) {
    return decodeAudioArrayBuffer(ctx, cached.slice(0));
  }
  const raw = await fetchAudioArrayBufferForDecode(url);
  await set(bufferKey(url), raw);
  return decodeAudioArrayBuffer(ctx, raw.slice(0));
}
