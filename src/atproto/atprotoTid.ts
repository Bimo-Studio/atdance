/**
 * Random valid ATProto TID-shaped key for `com.atproto.repo.putRecord` `rkey`
 * (time-ordered TID generation is optional for MVP; uniqueness is sufficient).
 */
const FIRST = '234567abcdefghij' as const;
const REST = '234567abcdefghijabcdefghijklmnopqrstuvwxyz' as const;

export function newAtprotoTid(): string {
  const b = new Uint8Array(13);
  crypto.getRandomValues(b);
  let s = FIRST[b[0]! % FIRST.length]!;
  for (let i = 1; i < 13; i++) {
    s += REST[b[i]! % REST.length]!;
  }
  return s;
}
