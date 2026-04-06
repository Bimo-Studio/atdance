/// <reference lib="webworker" />
/**
 * Dedicated worker: fetch audio bytes only (decode stays on main thread — AudioBuffer is not transferable).
 * Plan Phase 2.1 — offload network from main thread.
 */
self.onmessage = (e: MessageEvent<string>): void => {
  const url = e.data;
  void fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${String(res.status)}`);
      }
      return res.arrayBuffer();
    })
    .then((ab) => {
      (self as DedicatedWorkerGlobalScope).postMessage(ab, [ab]);
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      (self as DedicatedWorkerGlobalScope).postMessage({ error: msg });
    });
};

export {};
