/**
 * Decode fetched audio into an AudioBuffer (Web Audio API).
 */
export async function decodeAudioFromUrl(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch audio: ${url} (${res.status})`);
  }
  const raw = await res.arrayBuffer();
  return decodeAudioArrayBuffer(ctx, raw);
}

export async function decodeAudioArrayBuffer(
  ctx: AudioContext,
  raw: ArrayBuffer,
): Promise<AudioBuffer> {
  return ctx.decodeAudioData(raw.slice(0));
}
