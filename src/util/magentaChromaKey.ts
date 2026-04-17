/**
 * Detect classic #FF00FF-style chroma (high R+B, low G). Tuned for StepMania-style
 * arrow PNGs so gray note bodies (near-equal R, G, B) are not keyed.
 */
export function isMagentaChromaKeyRgb(r: number, g: number, b: number): boolean {
  return r >= 228 && b >= 228 && g <= 100;
}
