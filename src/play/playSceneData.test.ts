import { describe, expect, it } from 'vitest';
import { buildPlaySceneDataForPvpCountdown, type PlaySceneData } from './playSceneData';

describe('buildPlaySceneDataForPvpCountdown', () => {
  it('returns chart + wall-clock PvP context for HTTP chart path', () => {
    const data: PlaySceneData = buildPlaySceneDataForPvpCountdown({
      chartUrl: '/songs/demo/demo.dance',
      agreedStartAtUnixMs: 1_700_000_000_000,
      chartIndex: 2,
    });
    expect(data.chartUrl).toBe('/songs/demo/demo.dance');
    expect(data.chartIndex).toBe(2);
    expect(data.pvp?.agreedStartAtUnixMs).toBe(1_700_000_000_000);
    expect(data.pvp?.autoStartAudio).toBe(true);
    expect(data.useMinimal).toBeUndefined();
  });

  it('returns minimal chart flag when requested', () => {
    const data = buildPlaySceneDataForPvpCountdown({
      agreedStartAtUnixMs: 42,
      useMinimal: true,
    });
    expect(data.useMinimal).toBe(true);
    expect(data.chartUrl).toBeUndefined();
    expect(data.pvp?.agreedStartAtUnixMs).toBe(42);
  });
});
