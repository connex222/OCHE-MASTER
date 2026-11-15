# OCHE — Bible Compliance and QA

Checked: 15 November 2026, 14:00 UTC

## Verified

- 42 positive static, package and unit checks
- All 18 original uploaded file contents are byte-for-byte preserved
- All nine approved image filenames/dimensions present
- Greyscale flights, transparent cabinet aperture, and source syntax checked
- The Bible section 8 optional features have not been added

## Known limitations

- Full WebSocket simulation unavailable offline: npm dependency ws not installed
- Sound media (18 effects/music and 7 voice clips) and fonts are **linked**, not embedded in this deliverable; Docker builds download them from their origin when internet is available.
- The package was not uploaded to GitHub or deployed to Render in this environment.
- iOS Safari/Android Chrome over HTTPS, calibration fairness, multi-player completion and TV legibility need real-device verification.
- Original TV CSS uses #D7263D/#1F8A4C for interface accents, while Bible red/green #C8202F/#127A3E are used for the precision board; kept existing code unchanged.

## Failures

- None in the checks performed

## Detailed checks

- Unchanged public/assets/img/PUT_IMAGES_HERE.txt
- Unchanged public/assets/fonts/PUT_FONTS_HERE.txt
- Unchanged public/assets/sfx/caller/PUT_CALLER_CLIPS_HERE.txt
- Unchanged public/assets/sfx/PUT_SOUNDS_HERE.txt
- Unchanged public/index.html
- Unchanged public/phone.html
- Unchanged public/tv.html
- Unchanged README.md
- Unchanged test/simulate.js
- Unchanged .gitignore
- Unchanged package-lock.json
- Unchanged package.json
- Unchanged lib/modes.js
- Unchanged lib/physics.js
- Unchanged lib/checkouts.js
- Unchanged lib/board.js
- Unchanged server.js
- Unchanged OCHE_BIBLE.md
- Image background.jpg (1920, 1080)
- Image cabinet.png (2048, 2048)
- Image sisal.png (1024, 1024)
- Image chalkboard.jpg (1200, 2000)
- Image logo.png (1600, 500)
- Image dart_fly_body.png (512, 512)
- Image dart_fly_flight.png (512, 512)
- Flight greyscale dart_fly_flight.png
- Image dart_stuck_body.png (512, 512)
- Image dart_stuck_flight.png (512, 512)
- Flight greyscale dart_stuck_flight.png
- Cabinet fully transparent over exact 1400px centred aperture
- Node syntax server.js
- Node syntax lib/board.js
- Node syntax lib/physics.js
- Node syntax lib/checkouts.js
- Node syntax lib/modes.js
- Node syntax test/simulate.js
- Node syntax deployment/fetch-media.js
- Browser JS syntax public/tv.html
- Browser JS syntax public/phone.html
- 25 recorded Creative Claw files mapped in deployment downloader
- Fonts fetched from Google Fonts
- Original unit tests pass: Perfect throws within 25mm of aim: 89.2%; Unit checks passed
