import { getAtprotoOAuthSession, signOutAtprotoSession } from '@/auth/atprotoSession';
import { stopInviteAllowlistWatcher } from '@/auth/inviteAllowlistWatch';
import { fetchBskyPublicProfileForDid, resolveAtHandleToDid } from '@/bsky/publicAppview';
import { ATDANCE_OPERATOR_ADMIN_HANDLE } from '@/config/operatorAdminHandle';

const SCENES_HIDE_AVATAR = new Set(['BootScene', 'SignInScene', 'PlayScene']);

let rootWrap: HTMLDivElement | null = null;
let avatarBtn: HTMLButtonElement | null = null;
let avatarImg: HTMLImageElement | null = null;
let menuEl: HTMLDivElement | null = null;
let adminItem: HTMLButtonElement | null = null;
let menuOpen = false;
let currentSceneKey = '';
let refreshGen = 0;
let cachedOperatorAdminDid: string | null | undefined;

function adminPanelHref(): string {
  return new URL('admin/', `${window.location.origin}${import.meta.env.BASE_URL}`).href;
}

async function operatorAdminDid(): Promise<string | null> {
  if (cachedOperatorAdminDid !== undefined) {
    return cachedOperatorAdminDid;
  }
  cachedOperatorAdminDid = await resolveAtHandleToDid(ATDANCE_OPERATOR_ADMIN_HANDLE);
  return cachedOperatorAdminDid;
}

/** Test hook: reset cached admin DID after env/mocks change. */
export function resetOperatorAdminDidCacheForTests(): void {
  cachedOperatorAdminDid = undefined;
}

export function accountMenuShouldShowForScene(sceneKey: string): boolean {
  return !SCENES_HIDE_AVATAR.has(sceneKey);
}

function closeMenu(): void {
  menuOpen = false;
  if (menuEl !== null) {
    menuEl.hidden = true;
  }
  avatarBtn?.setAttribute('aria-expanded', 'false');
}

function toggleMenu(): void {
  menuOpen = !menuOpen;
  if (menuEl === null) {
    return;
  }
  menuEl.hidden = !menuOpen;
  avatarBtn?.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
}

function onDocumentPointerDown(ev: PointerEvent): void {
  if (!menuOpen || rootWrap === null) {
    return;
  }
  if (!rootWrap.contains(ev.target as Node)) {
    closeMenu();
  }
}

async function doSignOut(): Promise<void> {
  closeMenu();
  stopInviteAllowlistWatcher();
  await signOutAtprotoSession();
  window.location.reload();
}

function ensureDom(): void {
  if (typeof document === 'undefined' || rootWrap !== null) {
    return;
  }

  rootWrap = document.createElement('div');
  rootWrap.id = 'atdance-account-menu-hud';
  rootWrap.style.cssText = [
    'position:fixed',
    'top:max(10px,env(safe-area-inset-top,0px))',
    'right:max(10px,env(safe-area-inset-right,0px))',
    'z-index:2147483647',
    'display:flex',
    'flex-direction:column',
    'align-items:flex-end',
    'gap:6px',
    'pointer-events:none',
    'font-family:system-ui,sans-serif',
  ].join(';');

  avatarBtn = document.createElement('button');
  avatarBtn.type = 'button';
  avatarBtn.title = 'Account';
  avatarBtn.setAttribute('aria-haspopup', 'true');
  avatarBtn.setAttribute('aria-expanded', 'false');
  avatarBtn.style.cssText = [
    'pointer-events:auto',
    'width:44px',
    'height:44px',
    'padding:0',
    'border:2px solid #445566',
    'border-radius:50%',
    'background:#1a1a24',
    'cursor:pointer',
    'overflow:hidden',
    'flex-shrink:0',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'color:#e8e8f0',
    'font-size:18px',
    'font-weight:600',
  ].join(';');

  avatarImg = document.createElement('img');
  avatarImg.alt = '';
  avatarImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:none';
  avatarBtn.appendChild(avatarImg);

  const fallbackLetter = document.createElement('span');
  fallbackLetter.className = 'atdance-account-menu-hud__fallback';
  fallbackLetter.style.cssText = 'display:block;line-height:1';
  fallbackLetter.textContent = '?';
  avatarBtn.appendChild(fallbackLetter);

  menuEl = document.createElement('div');
  menuEl.hidden = true;
  menuEl.role = 'menu';
  menuEl.style.cssText = [
    'pointer-events:auto',
    'min-width:200px',
    'background:rgba(12,12,20,0.96)',
    'border:1px solid #334455',
    'border-radius:8px',
    'box-shadow:0 8px 24px rgba(0,0,0,0.45)',
    'padding:6px',
    'display:flex',
    'flex-direction:column',
    'gap:4px',
  ].join(';');

  const mkItem = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.role = 'menuitem';
    b.style.cssText = [
      'width:100%',
      'text-align:left',
      'padding:10px 12px',
      'border:none',
      'border-radius:6px',
      'background:transparent',
      'color:#e8e8f0',
      'font-size:14px',
      'cursor:pointer',
    ].join(';');
    b.addEventListener('mouseenter', () => {
      b.style.background = '#2a2a3a';
    });
    b.addEventListener('mouseleave', () => {
      b.style.background = 'transparent';
    });
    b.addEventListener('click', () => {
      onClick();
    });
    return b;
  };

  adminItem = mkItem('Admin / allowlist', () => {
    closeMenu();
    window.location.assign(adminPanelHref());
  });
  adminItem.hidden = true;
  menuEl.appendChild(adminItem);

  const outItem = mkItem('Log out', () => {
    void doSignOut();
  });
  menuEl.appendChild(outItem);

  avatarBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    toggleMenu();
  });

  rootWrap.appendChild(avatarBtn);
  rootWrap.appendChild(menuEl);
  document.body.appendChild(rootWrap);
  document.addEventListener('pointerdown', onDocumentPointerDown, true);
}

/** Call once when the game boots (before or after Phaser starts). */
export function installAccountMenuHud(): void {
  ensureDom();
}

/**
 * Call from every scene’s `create()` so the avatar hides during play and sign-in.
 */
export function syncAccountMenuForGameScene(sceneKey: string): void {
  ensureDom();
  currentSceneKey = sceneKey;
  void refreshAccountMenuHud();
}

async function refreshAccountMenuHud(): Promise<void> {
  ensureDom();
  if (
    rootWrap === null ||
    avatarBtn === null ||
    avatarImg === null ||
    menuEl === null ||
    adminItem === null
  ) {
    return;
  }

  const gen = ++refreshGen;
  const session = getAtprotoOAuthSession();
  const sub = session?.sub?.trim();
  const show =
    sub !== undefined && sub.startsWith('did:') && accountMenuShouldShowForScene(currentSceneKey);

  if (!show) {
    rootWrap.style.display = 'none';
    closeMenu();
    return;
  }

  rootWrap.style.display = '';

  const [profile, adminDid] = await Promise.all([
    fetchBskyPublicProfileForDid(sub),
    operatorAdminDid(),
  ]);
  const handle = profile?.handle ?? null;
  const avatarUrl = profile?.avatarUrl ?? null;

  if (gen !== refreshGen) {
    return;
  }

  const initial = (
    handle?.[0] ??
    sub
      .replace(/^did:/, '')
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 1) ??
    '?'
  ).toUpperCase();
  const fallback = avatarBtn.querySelector('.atdance-account-menu-hud__fallback');
  if (fallback !== null) {
    (fallback as HTMLElement).textContent = initial;
  }

  if (avatarUrl !== null) {
    avatarImg.src = avatarUrl;
    avatarImg.style.display = 'block';
    if (fallback !== null) {
      (fallback as HTMLElement).style.display = 'none';
    }
  } else {
    avatarImg.removeAttribute('src');
    avatarImg.style.display = 'none';
    if (fallback !== null) {
      (fallback as HTMLElement).style.display = 'block';
    }
  }

  avatarBtn.title = handle !== null ? `@${handle}` : sub;
  adminItem.hidden = adminDid === null || sub !== adminDid;
}
