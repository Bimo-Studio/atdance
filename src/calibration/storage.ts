export const CALIBRATION_STORAGE_KEY = 'atdance.calibrationOffsetSec';

/** Signed seconds: positive ⇒ taps were late vs metronome (subtract from audio clock in gameplay). */
export function getCalibrationOffsetSec(): number {
  try {
    const raw = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (raw === null) {
      return 0;
    }
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function setCalibrationOffsetSec(sec: number): void {
  try {
    localStorage.setItem(CALIBRATION_STORAGE_KEY, String(sec));
  } catch {
    /* private mode / quota */
  }
}
