/**
 * PvP lobby panel layout + color tokens (PRD P2 — side-by-side shell).
 * Phaser Y grows downward; panel centers approximate “safe” playfield halves.
 */
export const LOBBY_LAYOUT = {
  /** Local (left) stroke / label accent — cool blue */
  localStroke: 0x5cb8ff,
  /** Remote (right) stroke / label accent — warm orange */
  remoteStroke: 0xff8c5c,
  /** Panel fill (dark blue-grey) */
  panelFill: 0x1a2434,
  /** Horizontal margin inside each half */
  marginX: 12,
  /** Title band Y */
  titleY: 40,
  /** Panel vertical center Y */
  panelCenterY: 300,
  /** Panel height (px) */
  panelHeight: 360,
  /** HUD line Y offset from panel top (approx) */
  hudYOffset: 200,
} as const;
