# OCHE: Master Game, Graphics and Sound Bible

**One document, three builders.** Claude owns code, physics and rules. ChatGPT owns images. Creative Claw owns sound, music and the caller's voice. Everyone follows this file. If something here changes, update this file first.

---

## 1. The game in one paragraph

OCHE (pronounced "ock-ee", the line darts players stand behind) is a pub-darts party game. The TV is the dartboard on the wall of a warm, wood-panelled British pub, with a slate chalkboard scorer beside it. Each player's phone is their dart. Flick the phone like a real throw, or swipe a dart up the screen. A gravel-voiced caller announces every score. Up to 8 players, 7 game modes, family-friendly.

## 2. Art direction (for ChatGPT)

**Mood:** a proper British local on darts night. Brass, dark oak, slate chalkboard, warm tungsten light, a spotlight on the board. Premium and tactile, never cartoony, never neon.

**Palette (use these hexes):**

| Name | Hex | Used for |
|---|---|---|
| Slate | `#1E2724` | Chalkboard |
| Chalk | `#EEEDE6` | Text, chalk marks |
| Board red | `#C8202F` | Doubles/trebles |
| Board green | `#127A3E` | Doubles/trebles |
| Brass | `#D4A73A` | Highlights, winner text, logo trim |
| Oak | `#5A3B22` | Frames, wall panels |
| Room dark | `#140E0A` | Shadows, page background |

**Lighting:** single warm overhead spotlight from upper left. Everything else falls off into shadow.

**Hard rule: never draw the playing dartboard itself.** The code draws the scoring board with exact regulation measurements so every pixel scores correctly. AI images cannot hold that precision. ChatGPT supplies everything *around* the board.

## 3. Image asset list

All files go in `public/assets/img/`. Exact filenames matter. Every file is optional: if one is missing, the game uses its built-in version.

| File | Size (px) | Format | What it is |
|---|---|---|---|
| `background.jpg` | 1920 × 1080 | JPG | The pub wall the board hangs on |
| `cabinet.png` | 2048 × 2048 | PNG, transparent | Oak dartboard cabinet with open doors, empty centre |
| `sisal.png` | 1024 × 1024 | PNG, greyscale | Close-up sisal fibre texture, laid over the board |
| `chalkboard.jpg` | 1200 × 2000 | JPG | Slate chalkboard surface for the scoreboard |
| `logo.png` | 1600 × 500 | PNG, transparent | OCHE wordmark |
| `dart_fly_body.png` | 512 × 512 | PNG, transparent | Dart seen from directly behind, in flight, no flights |
| `dart_fly_flight.png` | 512 × 512 | PNG, transparent | Just the flights from the same view, pure white |
| `dart_stuck_body.png` | 512 × 512 | PNG, transparent | Dart stuck in a board, seen from the front, no flights |
| `dart_stuck_flight.png` | 512 × 512 | PNG, transparent | Just the flights from the same view, pure white |

### Why the darts come in two layers

Each player has their own colour. The code tints the **white** flight layer to the player's colour at runtime. So the flights must be **pure white with grey shading only**, and the two layers must line up pixel-for-pixel on the same 512 × 512 canvas.

### Anchor points (critical)

- **`dart_stuck_*`:** the dart's **tip must be exactly at pixel (256, 480)**, bottom centre. The dart points out of the board towards the viewer, leaning slightly up and to the right, flights at the top of the image.
- **`dart_fly_*`:** the dart is **centred at (256, 256)**, seen straight from behind so the four flights form an X.

### ChatGPT prompts

Paste each prompt as written. Ask for the exact size each time.

**background.jpg**
> Photorealistic interior of a traditional British pub at night, 1920×1080, landscape. Dark oak panelled wall filling the left two thirds of the frame, with a large empty area of wall centred in the left two thirds where a dartboard will be added later (leave that area completely empty). Warm tungsten spotlight from upper left falling on that empty wall area. Soft background blur, brass fittings, a hint of a bar to the far right in deep shadow. Colours: dark oak #5A3B22, deep shadow #140E0A, brass #D4A73A. No dartboard, no text, no people, no logos.

**cabinet.png**
> Front view of an empty traditional oak dartboard cabinet with both doors fully open, 2048×2048, transparent background. The cabinet is perfectly centred and symmetrical. The circular area in the middle where the dartboard would hang must be fully transparent, a perfect circle about 70% of the image width. The inside of the doors has chalk scoring panels with faint chalk smudges and no readable writing. Warm light from upper left, rich dark oak #5A3B22 with brass hinges #D4A73A. Photorealistic. No dartboard, no text.

**sisal.png**
> Seamless extreme close-up texture of compressed sisal fibres as on a professional bristle dartboard, 1024×1024, greyscale only, viewed straight on. Fibres run towards the viewer so you see thousands of tiny fibre ends. Mid-grey average tone so it can be multiplied over colour without darkening it much. No colour, no wires, no numbers.

**chalkboard.jpg**
> Seamless slate chalkboard surface, 1200×2000 portrait, viewed straight on, evenly lit. Deep green-black slate #1E2724 with soft, faint chalk dust smudges and old wiped-out marks around the edges. The centre must stay clean and readable. No writing, no frame, no text.

**logo.png**
> Wordmark logo reading exactly "OCHE" in bold, condensed, slightly vintage pub-sign lettering, 1600×500, transparent background. Chalk white #EEEDE6 letters with a thin brass #D4A73A inline and a subtle hand-painted texture. A small stylised dart flies through the letter O. Flat front view, no background, no extra words.

**dart_fly_body.png**
> A professional steel-tip tungsten dart seen from directly behind as it flies away from the camera, 512×512, transparent background, centred exactly in the middle. Show only the shaft end and barrel silhouette, NO flights. Knurled silver tungsten barrel, black shaft. Warm light from upper left. Photorealistic product render.

**dart_fly_flight.png**
> The same view as a dart seen from directly behind in flight, 512×512, transparent background, centred exactly in the middle: draw ONLY the four dart flights forming an X shape, standard kite shape, pure white with soft grey shading only, no colour, no logo, no shaft or barrel.

**dart_stuck_body.png**
> A steel-tip tungsten dart stuck in a dartboard, viewed from the front, 512×512, transparent background, no dartboard visible. The dart's tip is at the bottom centre of the image (pixel 256, 480) and the dart points towards the viewer, leaning slightly up and to the right, so the barrel is foreshortened and the flight end sits near the top of the image. Show the point, knurled silver barrel and black shaft only, NO flights. Small soft contact shadow at the tip. Warm light from upper left. Photorealistic.

**dart_stuck_flight.png**
> Same framing as a dart stuck in a board viewed from the front, 512×512, transparent background, tip position at pixel (256, 480): draw ONLY the four flights at the top end of the dart, seen at a slight angle, standard kite shape, pure white with soft grey shading only, no colour, no logo, no barrel or shaft.

### Checking the art

1. Upload the files to `public/assets/img/` in the GitHub repo.
2. Render redeploys automatically. Refresh the TV.
3. If a stuck dart floats off its landing spot, the tip is not at (256, 480). Move the dart in an image editor, or ask ChatGPT to regenerate with that instruction.

## 3b. Player avatars

Twelve cartoon characters. Each player picks one on their phone in the lobby; no two players can have the same one. Players who don't pick get a random free character.

**Files go in `public/assets/img/avatars/`.** Full length, 1024 × 1536, transparent PNG, feet near the bottom, head about 5% from the top. Until a file exists, the game draws a simple cartoon stand-in in the player's colour.

| File | Character | Nickname |
|---|---|---|
| `avatar_01_big_kev.png` | Kevin Kowalski | Big Kev the Kebab |
| `avatar_02_bounce_out_barry.png` | Barry Braithwaite | Bounce-Out |
| `avatar_03_double_trouble.png` | Derek Dobbs | Double Trouble |
| `avatar_04_the_mullet.png` | Malcolm McGinty | The Mullet |
| `avatar_05_wobbly_wayne.png` | Wayne Wainwright | Wobbly |
| `avatar_06_sir_arrows.png` | Stanley Ollerenshaw | Sir Arrows |
| `avatar_07_the_gladiator.png` | Gary Grimshaw | The Gladiator |
| `avatar_08_nigel_bust.png` | Nigel Bottomley | Bust |
| `avatar_09_the_shark.png` | Sharon Shufflebottom | The Shark |
| `avatar_10_bullseye_brenda.png` | Brenda Bagshaw | Bullseye |
| `avatar_11_treble_tap_tina.png` | Tina Tattersall | Treble Tap |
| `avatar_12_dinner_lady.png` | Doreen Duckworth | The Dinner Lady |

Names, nicknames, taglines and the caller's walk-on line live in `lib/avatars.js`. Edit them there.

**Where avatars appear:**
- Phone lobby: "Your character" card and the picker grid
- TV lobby: next to each player's name
- TV scoreboard: a head-and-shoulders crop (the top of the full-length image)
- Walk-ons: full screen, before every match
- Game over: the winner's full figure above the stats

**Walk-ons:** "Let's play darts!", then each player in turn: their character slides in, nickname in huge letters, tagline, "Played by Shaun", a sting, a cheer, and the caller announcing them. About 4 seconds each. The captain can skip them from their phone, and they can be switched off in the game setup.

## 4. Fonts

ChatGPT can't make fonts. Two free fonts (SIL Open Font Licence, safe to bundle) give the intended look:

| File | Suggested font | Where to get it |
|---|---|---|
| `public/assets/fonts/display.woff2` | **Oswald** (Bold) | fonts.google.com, or gwfh.mranftl.com for a ready .woff2 |
| `public/assets/fonts/chalk.woff2` | **Cabin Sketch** (Regular) | same |

Rename the downloaded files to exactly `display.woff2` and `chalk.woff2`. Without them, the game falls back to fonts already on the device.

## 5. Sound asset list (for Creative Claw)

All files go in `public/assets/sfx/` as **MP3**. Every file is optional: missing sounds are synthesised in the browser.

**Loudness:** aim for one-shots peaking around −3 dB, loops around −18 LUFS so they sit under speech. Trim silence from the start of every one-shot so it fires instantly.

| File | Length | Creative Claw prompt |
|---|---|---|
| `throw_whoosh.mp3` | 0.3 s | Short sharp whoosh of a dart cutting through air, close to the listener, dry, no reverb tail |
| `impact_board_1.mp3` | 0.3 s | Steel-tip dart thudding into a sisal bristle dartboard, firm dull thock, very short, dry |
| `impact_board_2.mp3` | 0.3 s | Same as a dart hitting a bristle dartboard, slightly deeper thock, variation |
| `impact_board_3.mp3` | 0.3 s | Same as a dart hitting a bristle dartboard, slightly brighter thock, variation |
| `impact_wire.mp3` | 0.6 s | Steel dart point striking a thin metal dartboard wire, bright metallic ping then a short rattle |
| `impact_wall.mp3` | 0.4 s | Dart hitting a wooden wall or the black rubber surround of a dartboard, dull wooden knock |
| `dart_fall.mp3` | 0.8 s | A dart dropping onto a wooden pub floor, two or three small clattering bounces |
| `darts_collect.mp3` | 0.8 s | Three darts being pulled out of a bristle dartboard one after another, quick scratchy pulls |
| `bull_sting.mp3` | 1.2 s | Short bright celebratory bell sting with a brassy shimmer, triumphant but brief |
| `crowd_cheer.mp3` | 2 s | Small pub crowd of 20 people giving an excited cheer and a few claps, indoor |
| `crowd_roar.mp3` | 3.5 s | Packed darts hall erupting for a 180, huge roar and whistles, indoor arena |
| `crowd_groan.mp3` | 1.5 s | Pub crowd giving a sympathetic disappointed "ohhh" groan, indoor |
| `crowd_applause.mp3` | 3 s | Warm sustained applause from a pub crowd for a match win, indoor |
| `ui_join.mp3` | 0.4 s | Friendly two-note wooden marimba blip, player joined, soft |
| `ui_turn.mp3` | 0.6 s | Gentle rising two-note chime, your turn, warm and unobtrusive |
| `walkon_sting.mp3` | 1.5 s | Short punchy brass and drum hit for a darts player walking on stage, crowd-pleasing, ends cleanly |
| `sting_win.mp3` | 2.5 s | Short triumphant brass fanfare in a British sports television style, ends cleanly |
| `ambience_pub.mp3` | 60 s loop | Background ambience of a cosy British pub during a game: low murmur of chatter, glasses clinking, no music, no clear words, loops seamlessly |
| `music_lobby.mp3` | 60–90 s loop | Upbeat retro British sports television theme, brass and funky bass, 1980s darts broadcast feel, instrumental, loops seamlessly |

The two long loops can come from Creative Claw's music generator; the rest from its sound effects generator.

### The caller (voice)

Design a voice in Creative Claw: **"A gravelly, warm, middle-aged British male darts MC. Theatrical, drawn-out delivery on big scores, clipped and calm on small ones."**

Files go in `public/assets/sfx/caller/`. Any missing clip is spoken by the browser's built-in British voice instead.

| File | Line |
|---|---|
| `0.mp3` | "No score" |
| `1.mp3` to `180.mp3` | The number in words, British style: "one hundred and twenty-one". Make `180.mp3` the famous long drawn-out "One hundred and eightyyyy!" |
| `gameon.mp3` | "Game on!" |
| `bust.mp3` | "No score" (said over a bust) |
| `killer.mp3` | "Killer!" |
| `gameshot_leg.mp3` | "Game shot, and the leg!" |
| `gameshot_match.mp3` | "Game shot, and the match!" |
| `letsplay.mp3` | "Ladies and gentlemen... let's play darts!" |
| `walkon_big_kev.mp3` | "Big Kev... the Kebab!" |
| `walkon_bounce_out_barry.mp3` | "Barry... Bounce-Out... Braithwaite!" |
| `walkon_double_trouble.mp3` | "Derek... Double Trouble... Dobbs!" |
| `walkon_the_mullet.mp3` | "Malcolm... The Mullet... McGinty!" |
| `walkon_wobbly_wayne.mp3` | "Wayne... Wobbly... Wainwright!" |
| `walkon_sir_arrows.mp3` | "Stanley... Sir Arrows... Ollerenshaw!" |
| `walkon_the_gladiator.mp3` | "Gary... The Gladiator... Grimshaw!" |
| `walkon_nigel_bust.mp3` | "Nigel... Bust... Bottomley!" |
| `walkon_the_shark.mp3` | "Sharon... The Shark... Shufflebottom!" |
| `walkon_bullseye_brenda.mp3` | "Brenda... Bullseye... Bagshaw!" |
| `walkon_treble_tap_tina.mp3` | "Tina... Treble Tap... Tattersall!" |
| `walkon_dinner_lady.mp3` | "Doreen... The Dinner Lady... Duckworth!" |

Walk-on clips should be big and theatrical, with long drawn-out pauses, like a boxing announcer. Without a clip, the built-in voice says "Playing for Shaun. Big Kev, the Kebab!".

Lines with player names ("Sue, you require forty") always use the built-in voice, because names change every game. Recording the 181 number clips is optional; start with `180`, `gameon`, `gameshot_leg`, `gameshot_match` for the biggest impact.

## 6. How the game works (for Claude and future edits)

### Screens

| Device | Screens |
|---|---|
| TV (`/tv`) | Start splash, lobby (code + players + chosen game), walk-ons, game (board + chalkboard scorer), game over (stats table) |
| Phone (`/phone`) | Join, choose control, lobby (character picker, captain picks game), waiting (incl. walk-ons), motion throw, swipe throw, game over, settings, captain tools, calibration |

### Turn flow

1. Server tells everyone whose turn it is. Phone buzzes.
2. Phone streams live aim 30 times a second. TV shows a crosshair in the player's colour and eases the camera in.
3. Player throws. Phone sends **aim, power, steadiness, sideways push**.
4. Server calculates the landing point and the score, applies the game rules, and broadcasts the result.
5. TV animates the dart (about 0.5 s), it lands, the board shakes, sisal dust flies, sounds play.
6. After 3 darts (or a bust or a win), the visit total is called, darts are pulled out, next player.

### Motion throw (phone held like a TV remote)

| Phone movement | Effect |
|---|---|
| Turn left or right | Crosshair moves left or right |
| Tilt the top up or down | Crosshair moves up or down |
| Thumb on the pad | "Grips" the dart, arms the throw |
| Sharp forward flick | Throw. Strength of the flick = power |
| Twisting the wrist during the flick | Less steady = wider spread |
| Sweeping sideways during the flick | Pushes the dart left or right |

The aim used is where the crosshair was 0.1 s **before** the flick started, so the flick itself never drags the aim.

### Swipe throw

| Action | Effect |
|---|---|
| Touch the mini board | Places the crosshair (drawn slightly above the finger so it stays visible) |
| Flick the dart up from the bottom | Throw. Flick speed = power |
| Flicking at an angle | Pushes the dart sideways |
| Wobbly, curved swipe | Less steady = wider spread |

### Physics model (all in `lib/physics.js`)

The landing point = aim + power error + random spread.

| Setting | Default | Effect of raising it |
|---|---|---|
| `baseSigma` | 9 mm | Even perfect throws spread wider |
| `stabilitySigma` | 28 mm | Shaky throws punished more |
| `powerSigma` | 12 mm | Wrong power also adds spread |
| `perfectBand` | ±6% | Wider "perfect power" window |
| `powerDrop` | 85 mm | Soft throws drop lower, hard throws sail higher |
| `minReach` | 0.3 | Below this power the dart falls short |
| `wireZone` | 1 mm | Bounce-outs happen further from wires |

| Difficulty | Spread | Power effect | Bounce-out chance near a wire |
|---|---|---|---|
| Easy | ×0.55 | ×0.45 | 8% |
| Normal | ×1.00 | ×1.00 | 20% |
| Pro | ×1.30 | ×1.25 | 28% |

With a calibrated, steady, perfect-power throw on Normal, about 90% of darts land within 25 mm of the aim. That's a strong pub player: trebles are hit regularly, not every time.

**Calibration:** three practice throws set each player's personal "perfect power", stored on their phone. A gentle thrower and a strong thrower are equally fair.

### Game modes

| Mode | Players | Rules summary |
|---|---|---|
| 501 / 301 / 701 | 1–8 | Count down to zero, finish on a double (optional double-in). Bust rules. Checkout hints |
| Round the Clock | 1–8 | Hit 1 to 20 in order, optional bull finish, optional skip-ahead on doubles/trebles |
| Round the World | 1–8 | Doubles only, D1 to D20, optional bullseye finish |
| Cricket | 1–8 | 15–20 and bull, three marks to close, score on closed numbers, round limit |
| Shanghai | 1–8 | Round number is the target; single + double + treble in one visit wins instantly |
| Killer | 2–8 | Secret numbers, become a Killer on your double, take lives off rivals |
| Free Practice | 1–8 | No rules, tracks three-dart average and best visit |

All modes support single game or best of 3 / 5, and an optional bull-off for throwing order.

### Message protocol (WebSocket JSON)

| From | Message | Purpose |
|---|---|---|
| TV | `host` | Create or reclaim a room |
| Phone | `join` | Join with code, name, saved player id |
| Phone (captain) | `setup`, `start` | Choose mode and options, start |
| Phone | `settings` | Difficulty, control type |
| Phone | `aim` | Live crosshair (30/s) |
| Phone | `throw` | `{aim, power, stability, lateral, input}` |
| Phone (captain) | `undo`, `skip`, `end`, `again` | Captain tools |
| Server | `state` | Full public game state after every change |
| Server | `turn`, `dart`, `visit`, `legEnd`, `bullResult` | Events that drive animation and sound |

## 7. Quality checklist before calling it AAA

- [ ] Every image in section 3 delivered and anchors checked on the TV
- [ ] All 12 avatars delivered, same scale, transparent, checked on the walk-on screen
- [ ] Fonts in place
- [ ] All 19 sound files, levels balanced against the caller
- [ ] Caller clips: at least `180`, `gameon`, `gameshot_leg`, `gameshot_match`
- [ ] Played on an iPhone (Safari) and an Android (Chrome) over https, both control types
- [ ] Every player calibrated, throws feel fair at Normal
- [ ] A child can complete Round the Clock on Easy with swipe
- [ ] A 3-player Cricket and a 4-player Killer played to the end
- [ ] TV readable from across the room; phone readable outdoors and in the dark

## 8. Next features (not built yet)

- QR code on the TV to join without typing the code
- Computer opponents at three skill levels for solo play
- Darts deflecting off darts already in the board
- More modes: Bob's 27, Halve It, Baseball, Golf
- Per-player lifetime stats saved on each phone
- Walk-on music per character
