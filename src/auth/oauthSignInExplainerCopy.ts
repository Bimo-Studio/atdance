/**
 * Plain-language copy for the sign-in screen (before the browser opens the provider’s consent page).
 * Kept in one module so wording stays consistent if we reuse it elsewhere.
 */
export interface OauthExplainerBlock {
  readonly title: string;
  readonly body: string;
}

/** What ATDance uses OAuth for — matches the numbered list we share with players. */
export const oauthSignInWhatWeDo: readonly OauthExplainerBlock[] = [
  {
    title: 'Use an account you already have',
    body: 'You sign in with your ATProto handle. For many people, that is the same kind of account they use with Bluesky. You do not create a brand-new username and password only for this game.',
  },
  {
    title: 'Stay signed in on this device',
    body: 'After you sign in, this browser can remember you so you do not have to type your handle every visit. That lasts until you sign out or clear site data for this site.',
  },
  {
    title: 'Guest list (invite-only)',
    body: 'If this game is in invite-only mode, we use your account’s ID to check that you are on the allowed list. We are not browsing your profile for extra details—just that ID check.',
  },
  {
    title: 'Save a score only when you click',
    body: 'After a run, if you press “Save score to PDS,” we can store that score in your ATProto repo. We do not auto-save every run or post scores to your feed without you choosing it.',
  },
  {
    title: 'You can sign out',
    body: 'On the title screen, use Sign out when you want this device to forget your login.',
  },
];

/**
 * What this game’s code does not use your session for. OAuth may still grant broad “ATProto” access
 * at the provider; we describe app behavior here, not every theoretical API permission.
 */
export const oauthSignInWhatWeDoNot: readonly OauthExplainerBlock[] = [
  {
    title: 'No posting as you',
    body: 'ATDance does not publish posts, replies, reposts, or likes for you. Nothing goes to your feed or anyone else’s unless we ship a separate feature and make that obvious.',
  },
  {
    title: 'No DMs',
    body: 'We do not read or send direct messages for you.',
  },
  {
    title: 'No digging through contacts',
    body: 'We do not pull your contact list or “who you know” to track or advertise to people around you.',
  },
  {
    title: 'Public lookups only where needed',
    body: 'Some screens use the same kind of public search a profile page uses—for example to turn a handle into an ID or to suggest accounts when you type @. That is not access to private inbox or hidden data.',
  },
];
