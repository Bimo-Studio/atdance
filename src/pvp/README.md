# PvP / matchmaking browser storage (DID-namespaced)

Keys and shapes for **`idb-keyval`** used by song prefs and magnets. All keys are **per ATProto DID** so shared machines do not bleed accounts.

## Key names (`src/pvp/didStorageKey.ts`)

| Logical store           | Storage key pattern                          | Example                                    |
| ----------------------- | -------------------------------------------- | ------------------------------------------ |
| Magnet library          | `atdance.magnets.v1::<url-encoded-did>`      | `atdance.magnets.v1::did%3Aplc%3Aabc`      |
| Song priority (3 slots) | `atdance.songPriority.v1::<url-encoded-did>` | `atdance.songPriority.v1::did%3Aplc%3Aabc` |
| Peer RTT table (P3)     | `atdance.peerRtt.v1::<url-encoded-did>`      | `atdance.peerRtt.v1::did%3Aplc%3Aabc`      |

`<url-encoded-did>` is `encodeURIComponent(did)`.

### E2E / Playwright (`?e2e=1`)

When **`e2e=1`**, there is no OAuth session; **`getStorageDid()`** (`src/util/storageDid.ts`) uses a synthetic DID:

- Default: `did:web:e2e.atdance.local#1`
- Override: `?e2e_did=<token>` (letters, digits, `.`, `_`, `-` only) to isolate IndexedDB like a different account.

## JSON shapes

### Magnet library (`magnetLibraryStore.ts`)

- **Stored value:** JSON array of objects `{ "uri": string, "label"?: string }`.
- **`uri`:** must start with `magnet:`.
- **Max entries:** **50** (`MAX_MAGNETS`). Older entries are truncated on save/load.

### Song priority (`songPriorityStore.ts` + `prioritySlotCodec.ts`)

- **Stored value:** JSON array of **exactly 3** strings — one per priority slot, ordered **1 → 2 → 3**.
- Each string is either **`""`** (empty slot) or an **encoded** `PlaySceneData` payload from `encodePrioritySlot` (HTTP chart, torrent magnet row, etc.).
- **Torrent / magnet charts:** encoded as `magnet:<uri>` when `PlaySceneData.magnetUri` is set (see `prioritySlotCodec.ts`).
- **Validation:** `saveSongPriority` throws if the encoded array length is not 3.

## Peer RTT table (P3)

`PeerRttTable` (`peerRttTable.ts`) is **in-memory** with TTL eviction. **idb** persistence for RTT rows is **deferred to P3** (see tasks **P1.2b** / **P3.2**); do not duplicate persistence in P1.

## Related

- PRD: `docs/prd-pvp-matchmaking.md` §5.
- Tasks: `docs/tasks-pvp-matchmaking.md`.
- Lobby layout tokens (P2): `lobbyLayout.ts` (`LOBBY_LAYOUT`), used by `PvpLobbyScene`.
