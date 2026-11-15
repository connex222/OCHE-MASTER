# OCHE production handover — Bible-constrained asset pass

- The original uploaded application source (server.js, lib/*, public/*.html, tests, package files) is byte-identical with the original ZIP.
- The nine 2D image assets are located in public/assets/img, with exact names and dimensions from the Bible.
- In particular the playing dartboard is **not an image**. The original precision-rendered and scored board remains in control.
- The stuck-dart body point is at pixel (256,480); flight and body canvases are 512x512. Flying dart is centred (256,256).
- The deployment folder has an optional Node.js downloader for the 18 Creative Claw sound files, 7 recorded British-caller clips and two OFL fonts. Running it needs internet access and can cost build time.
- The Dockerfile is added **only** because the user's existing Render service is configured for Docker, not the Node runtime described in the original README.
- No changes to the seven game modes, physics, scoring, phone controllers or layout.
- The browser provides fallback graphics and speech when optional media is unavailable. The Docker build deliberately fails if the expected production media cannot be downloaded.
- The original source is not yet fully end-to-end tested: `npm test` passes unit checks but stops at `Cannot find module 'ws'` in the offline environment before WebSocket game simulation. It must be run with `npm ci` on an internet-enabled environment.
- Real iOS Safari, Android Chrome, motion calibration, multi-player complete games and TV distance/legibility remain unverified until user testing.
- No additional features from Bible section 8 were added.
