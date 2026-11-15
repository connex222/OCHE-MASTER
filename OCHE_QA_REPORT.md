# OCHE — Bible Production QA

Updated: 15 November 2026 (UTC)

## Current release

- Repository: https://github.com/connex222/OCHE-MASTER (`main`).
- Render service: https://oche-master.onrender.com/tv
- Render auto-deploy enabled. Every Docker build is gated by:
  1. `node test/bible-regression.js` — 20 deterministic test groups across all seven game modes, including a real SVG QR matrix check.
  2. `npm test` — real WebSocket simulation of a completed 301 game, return to lobby, Killer rematch, and captain undo.
  3. `node test/party-smoke.js` — eight-phone capacity, phone and TV reconnection, seat reclaim, and start/authoritative throw/end/return-to-lobby for every mode (11 smoke checks).
- Render release gating was verified on 15 November 2026, including 20 rules/QR groups, the full 301 WebSocket simulation, and 11 additional eight-phone/party smoke checks. Deployments that fail the Docker build checks cannot replace the live version.

## Verified implementation

- The regulation dartboard and scoring geometry remain code-drawn; AI artwork does **not** replace the playable board.
- All nine named Bible artwork assets were delivered with the required canvas sizes and dart anchors.
- Render's build log confirms all 18 SFX/music tracks, seven recorded caller clips, and both specified fonts were successfully installed. Number clips outside those seven recordings currently use browser speech.
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
