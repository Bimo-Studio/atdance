# Changelog

## 1.0.0 (2026-04-17)


### Features

* acknowledgements scene, lobby [@handle](https://github.com/handle), and MIDI credits bed ([b6d80c1](https://github.com/Bimo-Studio/atdance/commit/b6d80c17ba8a0df2258d2451000b6434d033900d))
* **admin,play,calibration:** oauth parity, exit hold, calibration track, lane hold feedback ([13ca4c9](https://github.com/Bimo-Studio/atdance/commit/13ca4c91e6c01f3daaa6c9a3ecc93fdcdbac79af))
* **admin:** operator token for allowlist UI; fix(build): skip unchanged midi manifest/engine sync ([9391944](https://github.com/Bimo-Studio/atdance/commit/93919442f714c1be00f7716ce9a9085c452e6e65))
* **auth:** wire ATProto invite allowlist on client and relay queue ([61c455c](https://github.com/Bimo-Studio/atdance/commit/61c455c708623dc4822fb20d851c6ec596e42788))
* **build:** surface git SHA in HTML comment and in-game build info ([0363988](https://github.com/Bimo-Studio/atdance/commit/0363988739819685a3b7e9747d036dd30a93bfe9))
* **p2p:** add client scaffolding, env parsing, and proof tests for PRD ([6933ed4](https://github.com/Bimo-Studio/atdance/commit/6933ed4eaca99abc1f9f8b0af9129a50a4dbe724))
* **p2p:** sync lab p2p path, docs, and digitalocean infra automation ([164bc25](https://github.com/Bimo-Studio/atdance/commit/164bc255296716c4b8436a186710205a8df763e1))
* **play:** improve start UX, audio unlock, and first-cue timing hint ([0301ff1](https://github.com/Bimo-Studio/atdance/commit/0301ff10e2e4a1a584beac1a727d1f4095fa8a3e))
* **pvp:** close matchmaking audit gaps for relay, countdown, and observability ([d3a958a](https://github.com/Bimo-Studio/atdance/commit/d3a958a182944c686cc6fef9ba3a6b0e6f25a970))
* **relay:** password login and session JWT for /admin allowlist UI ([c9783f7](https://github.com/Bimo-Studio/atdance/commit/c9783f7ad2b34a4645fefe0ce10338836555e79d))
* **ui:** account avatar menu with logout and admin link; remove hidden admin shortcut ([5336178](https://github.com/Bimo-Studio/atdance/commit/5336178d3a40c1cdcad1d744a3abc5befdd98f72))
* **ui:** acknowledgements scene, lobby handles, midi bed, and oauth origin fix ([41e578f](https://github.com/Bimo-Studio/atdance/commit/41e578f52536b748b9a25e20b77c16d2fe570b9a))


### Bug Fixes

* **admin:** dev routing, OAuth return path, session boot, DID gate ([85faf7b](https://github.com/Bimo-Studio/atdance/commit/85faf7bf51fdfc6fd77af332b0ec62a841544395))
* **auth:** support ATProto OAuth on deployed origins ([9822510](https://github.com/Bimo-Studio/atdance/commit/982251027b78853a076e527d6cd2b087a09fca06))
* **ci:** resolve CI pipeline issues ([eba82a3](https://github.com/Bimo-Studio/atdance/commit/eba82a37e37bd315ab7759d76c02c46227eb1b99))
* **ci:** resolve CI pipeline issues ([b0c2cb0](https://github.com/Bimo-Studio/atdance/commit/b0c2cb02e1272d5dbb3481edefecee667f036f37))
* **relay:** add ATDANCE_ADMIN_API_TOKEN bearer for admin when OAuth JWKS fails ([fb16645](https://github.com/Bimo-Studio/atdance/commit/fb16645b486ba9b9f6260579f4dcbc8fc149a4bb))
* **relay:** handle empty OAuth JWKS, optional JWKS overrides, and DPoP for admin ([1e247f9](https://github.com/Bimo-Studio/atdance/commit/1e247f9ba33e24b6ccced72e947a892067defe0f))
* **relay:** normalize CORS origins and document admin preflight ([09c3fa5](https://github.com/Bimo-Studio/atdance/commit/09c3fa58d1cb3ff741ea8cf89ae640abdf443015))
* **relay:** sync wrangler with ALLOWLIST_KV and ATDANCE_ADMIN_HANDLE ([0a96217](https://github.com/Bimo-Studio/atdance/commit/0a96217120eb5e40991ff7b5ea683708b7c965f6))

## Changelog

Releases and history are maintained by [release-please](https://github.com/googleapis/release-please) (see `.github/workflows/release.yml`).
