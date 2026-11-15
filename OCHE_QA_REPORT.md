# OCHE — Bible Production QA

Updated: 15 November 2026 (UTC)

## Current release

- Repository: https://github.com/connex222/OCHE-MASTER (`main`).
- Render service: https://oche-master.onrender.com/tv
- Render auto-deploy enabled. Every Docker build is gated by:
  1. `node test/bible-regression.js` — 20 deterministic test groups across all seven game modes, including a real SVG QR matrix check.
  2. `npm test` — real WebSocket simulation of a completed 301 game, return to lobby, Killer rematch, and captain undo.
  3. `node test/party-smoke.js` — eight-phone capacity, phone and TV reconnection, seat reclaim, and start/authoritative throw/end/return-to-lobby for every mode (11 smoke checks).
  4. `node test/frontend-polish.js` — phone/TV script parsing, QR-room preference, connection/overlay safeguards, pointer capture, calibration and recorded-caller preloading (4 checks).
  5. `node test/navigation-smoke.js` — real WebSocket tests for lobby leave, active-game leave, captain handover, cross-room isolation and seat reclaim (5 checks).
- Render release gating was verified on 15 November 2026, including 20 rules/QR groups, the full 301 WebSocket simulation, and 11 additional eight-phone/party smoke checks. Deployments that fail the Docker build checks cannot replace the live version.

## November 15 AAA navigation / caller / throwing pass

- Source commit `296843e36c8814057affdd8615fb6289a6488877` passed all five Render build gates and reached **live**.
- Scanning a QR for a new room now overrides a phone's remembered older room; an invalid QR cannot silently reconnect to the wrong game.
- Leaving a game detaches the player's WebSocket from that room. Mid-match departures remain offline in the original turn order and the captain can skip them; reconnects reclaim the seat. Players can move rooms without receiving the previous room's updates.
- Connection-loss banner explains when throwing is paused; a disconnected phone cannot submit throws.
- When the match phase changes, settings/calibration overlays close automatically so players do not miss turns.
- The control-choice screen has an explicit return to joining. Touch targets are at least 44 px on relevant small controls, and browser zoom remains enabled.
- Swipe throwing includes the true finger-release position and ignores secondary pointers, with a 16 ms timing floor to prevent extreme power readings from sparse touch events. Motion grip uses pointer capture to handle fast/off-element releases.
- Three-throw swipe calibration uses the same release sampling. Reopening calibration cancels a pending auto-close timer; cancelling a gesture safely clears its active state.
- The TV preloads the seven already approved recorded caller clips during sound initialisation; browser speech remains the fallback for other scores and player names.
- No extra game modes and no changes to the server's scoring/physics model or any of the seven rule modules.

## Verified implementation

- The regulation dartboard and scoring geometry remain code-drawn; AI artwork does **not** replace the playable board.
- All nine named Bible artwork assets were delivered with the required canvas sizes and dart anchors.
- The new Bible build installs all 19 SFX/music tracks (including walk-on sting), 20 recorded caller clips (the original seven plus Let's Play Darts and 12 walk-on lines), and both specified fonts. Unrecorded numeric calls continue to use browser speech.
- QR join link targets `/phone?code=ROOM`, preserving manual room-code entry. The QR is generated entirely within the TV page using a bundled MIT-licensed library (local SVG), rather than exposing the current room code to an external image service. It regenerates only when the room changes, with a white scanning margin.
- The right-side X01 finishing guide uses server-provided hints, rather than a second scoring engine.
- Recorded or browser-spoken visit totals follow the server's **rules-credited** scores, including double-in and Shanghai.
- Dart artwork supports player-coloured flight layers, aligned to the Bible.
- Tested 720p and 1080p headless TV presentation, including eight-player X01, eight-player Cricket and lobby; no overall chalkboard overflow detected. Cricket marks no longer collide with other player rows.
- TV can enter or exit fullscreen using a visible non-obstructing button, or the F shortcut.
- Score announcements lower background loops during speech, and fresh caller announcements cancel stale ones. Mute stops audio already playing.

## Automated tests: verified passing

- 20 groups covering catalogue, options, board rings, all legal checkout routes, bogey finishes, X01 double-in/out and busts, Round the Clock, Round the World, Cricket, Shanghai, Killer, Free Practice, player counts and QR generation/room changes.
- Render WebSocket simulation: completed a 301 match, returned to lobby, started Killer and verified undo.
- Expanded party-night WebSocket suite: 8 simultaneous phone joins with unique colours, 9th rejected, phone reclaiming its seat, TV reclaiming its room, one authoritative throw per mode, rejection of out-of-turn darts and captain end/return to lobby in all seven modes. All 11 checks passed in the Render Docker build.
- Local Chromium smoke checks at 1280×720, 1920×1080 and portrait orientation. These use simulated game state and **do not certify real phone/TV hardware**.

## Still required before calling OCHE AAA-complete

- iPhone Safari and Android Chrome over HTTPS; check motion-throw permissions, sensor updates, fallback swipe, calibration and reconnection.
- Three-player Cricket and four-player Killer played completely on real devices, with join/leave, pause/reconnect and results checked.
- Test a child's Easy-mode swipe experience through Round the Clock.
- Assess live dart-throw fairness at Normal after each player's three-throw calibration; validate all game modes for pacing and end states.
- Listen to announcements on real TV speakers alongside impact sounds, music and room ambience; ensure all normal scores are spoken intelligibly.
- Test that the *locally generated* QR graphic scans on the actual TV at typical viewing distance. Manual room-code entry remains available if the camera cannot scan it.
- Check TV legibility across typical room distance and phone legibility in bright daylight/darkness.

## Change safeguards

- The existing physics and seven game-mode rule modules were not modified by the recent UI/audio/layout work.
- Do not add unapproved new modes, computer opponents or dart deflections without separately checking section 8 of the Bible.
- GitHub and Render status are not substitutes for the outstanding human device testing.

## 15 November 2026 — remaining AAA polish

- The 12 supplied portrait PNGs are retained byte-for-byte: full-length, transparent, 1024 × 1536, with the official avatar IDs in `lib/avatars.js`. Their real-TV visual scale and framing still require human inspection; header/alpha checks do not prove appearance quality.
- Corrected avatar-picker redraws: repeated lobby WebSocket state messages no longer recreate and reload all twelve character thumbnails. A changed character or an occupied/free slot still updates immediately.
- Corrected the opening caller sequence: the recorded "Game on" call starts first, and the first player's bull-off/checkout call waits until it has finished. Stale scheduled turn calls are discarded after a match transition.
- The seven original game modes, physics parameters and avatars are unchanged.
- New frontend QA: **7 passed**, including an executable simulated-DOM test proving stable avatar images and live selection updates.
- New full walk-on QA: **5 passed** in Render, verifying no scoring during entrances, all three sequential character presentations, automatic handover to playable bull-off, a valid first dart, and rematch introductions that the captain can skip.
- Render confirmed `727e5a7135c2b524112a00218055a41bbb7e465b` live after all release gates passed.

### Remaining human acceptance (not certified by automated tests)

- Listen to the caller and character entrances on the actual TV speakers; confirm that all 12 identities are pronounced clearly and that stings/cheers do not mask speech.
- Review all twelve full-length figures on a 720p TV, and the portrait crops on the scoreboard. Confirm there is no stretching, cropping or visual mismatch.
- Test the character picker on iPhone Safari and Android Chrome with two or more real players, including changing characters and reconnecting.
- Complete full three-player Cricket and four-player Killer matches on physical phones, including calibration, fairness, results and replay.
- If the browser-generated ordinary score totals sound noticeably inconsistent, consider replacing those with a larger matching recorded numeric library. The Bible makes that optional; no new modes are needed.
