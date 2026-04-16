import { formatAtprotoSignInErrorMessage } from '@/auth/atprotoSignInUserMessage';
import { atprotoSignInRedirectOptions } from '@/auth/loopbackOAuthRedirectUris';
import { normalizeAtprotoHandleInput } from '@/auth/normalizeAtprotoHandleInput';
import { loadAtprotoOAuthClient } from '@/auth/streamplaceOAuth';

/**
 * DOM sign-in strip for ATProto OAuth (used by SignInScene). Enter in the handle field submits the same as clicking the button.
 */
export function wireAtprotoSignInForm(
  input: HTMLInputElement,
  button: HTMLButtonElement,
  status: HTMLElement,
): void {
  const submitSignIn = (): void => {
    void (async () => {
      const h = normalizeAtprotoHandleInput(input.value);
      if (!h) {
        status.textContent = 'Enter your handle.';
        return;
      }
      if (button.disabled) {
        return;
      }
      button.disabled = true;
      status.textContent = 'Starting sign-in…';
      try {
        const client = await loadAtprotoOAuthClient();
        if (!client) {
          status.textContent =
            'OAuth client unavailable — set VITE_ATPROTO_PDS_HOST in .env.local.';
          return;
        }
        await client.signInRedirect(h, atprotoSignInRedirectOptions(window.location));
      } catch (e) {
        status.textContent = formatAtprotoSignInErrorMessage(e);
        console.error('[SignInScene] OAuth', e);
      } finally {
        button.disabled = false;
      }
    })();
  };
  button.addEventListener('click', submitSignIn);
  input.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') {
      return;
    }
    ev.preventDefault();
    submitSignIn();
  });
}
