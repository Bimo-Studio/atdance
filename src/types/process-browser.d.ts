/** Types for `import process from 'process/browser'` if we switch back from the inline `main.ts` polyfill. */
declare module 'process/browser' {
  import type { Process } from 'node:process';
  const proc: Process;
  export default proc;
}
