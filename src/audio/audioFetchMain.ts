/**
 * Fetch audio bytes via Web Worker when supported; main-thread fetch fallback (Vitest / SSR safe).
 */

async function fetchAudioMainThread(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch audio: ${url} (${res.status})`);
  }
  return res.arrayBuffer();
}

export async function fetchAudioArrayBufferForDecode(url: string): Promise<ArrayBuffer> {
  if (typeof Worker === 'undefined') {
    return fetchAudioMainThread(url);
  }

  try {
    const worker = new Worker(new URL('./audioFetch.worker.ts', import.meta.url), {
      type: 'module',
    });
    return await new Promise<ArrayBuffer>((resolve, reject) => {
      worker.onmessage = (ev: MessageEvent<ArrayBuffer | { error: string }>) => {
        worker.terminate();
        const d = ev.data;
        if (d && typeof d === 'object' && 'error' in d) {
          reject(new Error(d.error));
          return;
        }
        resolve(d as ArrayBuffer);
      };
      worker.onerror = (): void => {
        worker.terminate();
        void fetchAudioMainThread(url).then(resolve, reject);
      };
      worker.postMessage(url);
    });
  } catch {
    return fetchAudioMainThread(url);
  }
}
