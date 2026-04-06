/** Directory path of a URL (no trailing slash), or '' if no slash. */
export function directoryOfUrl(url: string): string {
  const i = url.lastIndexOf('/');
  return i <= 0 ? '' : url.slice(0, i);
}
