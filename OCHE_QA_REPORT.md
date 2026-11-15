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
- The new Bible build installs all 19 SFX/music tracks (including walk-on sting), 44 recorded caller clips (20 original/intro/character clips plus 24 numeric score recordings), and both specified fonts — 63 audio assets in total. Remaining unrecorded numbers continue to use browser speech.
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
- New frontend QA: **8 passed**, including an executable simulated-DOM test proving stable avatar images and live selection updates.
- New full walk-on QA: **5 passed** in Render, verifying no scoring during entrances, all three sequential character presentations, automatic handover to playable bull-off, a valid first dart, and rematch introductions that the captain can skip.
- Render confirmed `727e5a7135c2b524112a00218055a41bbb7e465b` live after all release gates passed.

### Remaining human acceptance (not certified by automated tests)

- Listen to the caller and character entrances on the actual TV speakers; confirm that all 12 identities are pronounced clearly and that stings/cheers do not mask speech.
- Review all twelve full-length figures on a 720p TV, and the portrait crops on the scoreboard. Confirm there is no stretching, cropping or visual mismatch.
- Test the character picker on iPhone Safari and Android Chrome with two or more real players, including changing characters and reconnecting.
- Complete full three-player Cricket and four-player Killer matches on physical phones, including calibration, fairness, results and replay.
- The full 0–180 score library is now professionally AI-generated in the established British OCHE caller voice. Check loudness, clipping and pacing on the actual TV; dynamic player names and checkout reminders still use device speech.

## 15 November 2026 — Creative Claw number caller pack

- Generated and installed 24 authentic British-style darts number announcements using the same ElevenLabs v4 voice ID as the 12 OCHE walk-on clips.
- Recorded scores: 12, 18, 20, 24, 26, 32, 36, 40, 45, 50, 57, 60, 80, 81, 85, 95, 100, 120, 121, 125, 140, 150, 160, 170. The existing 180 and "No score" calls remain untouched.
- Every recording is mapped to the exact `<score>.mp3` filename in the production downloader, validated by an additional frontend release check. Render confirmed **63 audio clips and 2 fonts**, and production commit `c33dbd55df3afb11c5c45ab5bf7a6a6214dbf269` became live.
- The TV loads the numeric clips progressively after the essential sound assets, avoiding a longer start screen. Uncovered scores still use browser speech rather than giving no call.
- The clips are AI-generated studio voice files; they are not human voice-actor recordings. Final audibility, pronunciation, relative loudness and pacing on TV hardware still require listening checks.

## 15 November 2026 — complete recorded numeric caller (0–180)

- **181 separate score calls now covered:** 38 individual MP3 clips (including 0 and 180) plus 143 individually playable segments from six Creative Claw studio score recordings. All generated with the same British ElevenLabs v4 caller voice (`JBFqnCBsd6RMkjVDRZzb`).
- Six scored audio reels span 14–39, 40–69, 70–99, 100–129, 130–159 and 160–179. Numbers already delivered individually are excluded from these reels. `public/assets/js/number-cues.js` records exact speech intervals from ElevenLabs word timings, checked against every expected English number and against unconsumed transcript words.
- The WebAudio caller plays just the appropriate interval from a shared recording, with a short fade-in/out to prevent clicks. The existing `180`, `Game on`, `Game shot`, walk-ons and other signature recordings have not been changed.
- The TV precaches 36 commonly used individual number files and six reels after essential sounds finish loading. If a media file fails to load, browser speech remains the reliability fallback rather than dropping the score announcement.
- The Render Docker build must now pass `node test/numeric-caller.js`: 181 distinct scores, six validated pack files, bounds on 143 cue intervals, local script usage and JS syntax. Production media inventory: **81 audio files + 2 fonts**, all fetched at build time.
- This changes **only audio presentation**. Dart physics, scoring, game modes, 12 avatars and navigation logic are unchanged.

### Real-device audio sign-off still outstanding

Listening to the grouped score clips on actual TV speakers is required before calling this AAA-complete. Check starts/ends of scores in the low teens, hyphenated scores such as 47 and 96, and long announcements such as 117 and 159. Check speech against darts impacts and the pub ambience, and listen for any abrupt syllables or inconsistent loudness.

Dynamic player names and phrases such as “you require ...” still use the browser's built-in voice because those phrases change per match. Recorded number scores no longer depend on browser speech during normal operation.

## 15 November 2026 — score caller de-duplication and pacing

- Reported during live play: **100** was heard twice from two voices shortly after one another. The server sends a single `visit` event, but the separate browser-generated next-player checkout reminder could repeat the same number; another TV tab previously wasn't explicitly silenced when replaced. These are code-supported possible causes, not a certified recording of the user's specific incident.
- Corrected `public/tv.html` to remember the most recently announced visit and ignore identical packets received within 3.5 seconds, while allowing legitimate later identical scores.
- If a newly active player's checkout number matches a just-announced visit total, the caller uses the player's name and a short “your turn” cue rather than saying the same score in another voice. Different checkout numbers still use the Bible's “you require ...” announcement.
- Turn reminders are now lower priority than studio-recorded score calls. They wait until the caller is free, and are discarded if the player has already thrown or the game has moved on.
- An obsolete TV tab now cancels its caller and mutes all sound upon receiving the server's `replaced` notification.
- Added `node test/caller-dedupe.js` to Render Docker release gates. **11 checks passed**, including a single 100 call without simultaneous browser speech, a second 100 in a later legitimate visit, shared number-reel playback, following checkout prompts, cancelled late reminders and replaced TV muting.
- The successful deployment `c0b9f8d861411d138c6c298b616c84c04b8d3a82` reached **live** at 21:02 UTC. Rule modules, physics, avatar images and number recordings were not changed.
- Physical-TV acceptance remains outstanding: listen to consecutive 100 visits and a 100 score followed by a 100 checkout requirement, ideally on the exact device/browser setup that showed the original issue. Distinguish a second TV tab from a second spoken `require` prompt if the problem persists.

## 15 November 2026 — calibration and interrupted-input recovery

- Fixed a phone lifecycle fault: when a new game phase arrived while the calibration panel was open, its sheet was hidden **before** `Calib.close()` was called. The closure check then failed, leaving `Motion.calibrating` or `Swipe.calibrating` active and potentially swallowing real throws.
- Calibration is now closed and gestures reset **before** hiding a sheet when a round/game phase changes.
- Socket disconnection, phone/background transitions and replacement by another tab safely cancel held motion/swipe gestures. A disconnected WebSocket can never submit a throw. The UI additionally waits for the server's fresh `welcome` before enabling throwing after reconnection.
- Swipe calibration tracks the primary pointer ID and ignores another finger's touch events. Motion calibration refuses invalid values or a fourth throw while its success banner is still visible; the three-sample median remains unchanged.
- Added the executable `node test/input-recovery.js` release gate: six tests verifying phase-transition ordering, cleanup, valid median, closure, reconnection input gating and single-finger capture. All six tests passed in Render.
- **Production deployment:** `09835a5fac14985deb358967784e0861afed653e` confirmed **live** on 15 November 2026.
- Existing throwing physics, difficulty parameters, mode rules, score caller recordings, twelve avatars and QR joining are unchanged.

### Remaining real-device sign-off

- Verify calibration can be interrupted by starting a game, locking/unlocking a phone, and brief network loss without trapping the next throw.
- Test iPhone Safari motion permissions and Android Chrome motion calibration on the actual phones used at games night.
- Verify swipe release accuracy with real touches, especially fast gestures and two-finger interruptions.
- Complete three-player Cricket and four-player Killer matches with authentic players before claiming full AAA acceptance.
