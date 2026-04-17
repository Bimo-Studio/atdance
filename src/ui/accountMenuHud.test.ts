import { describe, expect, it } from 'vitest';

import { accountMenuShouldShowForScene } from '@/ui/accountMenuHud';

describe('accountMenuHud', () => {
  it('hides avatar on boot, sign-in, and play only', () => {
    expect(accountMenuShouldShowForScene('BootScene')).toBe(false);
    expect(accountMenuShouldShowForScene('SignInScene')).toBe(false);
    expect(accountMenuShouldShowForScene('PlayScene')).toBe(false);
    expect(accountMenuShouldShowForScene('TitleScene')).toBe(true);
    expect(accountMenuShouldShowForScene('SongSelectScene')).toBe(true);
    expect(accountMenuShouldShowForScene('PvpLobbyScene')).toBe(true);
  });
});
