# OCHE

TV + phone party darts. The TV shows the board. Each player's phone is their dart: either **flick the phone** (motion) or **swipe the dart up the screen** (for children and anyone who'd rather not wave a phone about).

Game modes: 501 / 301 / 701, Round the Clock, Round the World (doubles), Cricket, Shanghai, Killer, Free Practice. 1 to 8 players, single game or best of 3 / 5, optional bull-off to decide who starts.

The game runs **now** with built-in graphics and synthesised sound. When the ChatGPT art and Creative Claw sounds are dropped into `public/assets/`, the game picks them up automatically. No code changes needed. See `OCHE_BIBLE.md` for the full asset brief.

---

## Files

| File | What it does |
|---|---|
| `server.js` | The referee. Hosts the pages, runs rooms, decides where every dart lands, scores it |
| `lib/board.js` | Exact regulation dartboard measurements and scoring |
| `lib/physics.js` | Turns a throw (aim, power, steadiness) into a landing point |
| `lib/modes.js` | Rules for every game mode |
| `lib/checkouts.js` | Checkout suggestions (e.g. 170 = T20 T20 BULL) |
| `public/tv.html` | The TV screen: board, darts in flight, scoreboard, sound, caller |
| `public/phone.html` | The phone controller: join, lobby, motion throw, swipe throw |
| `public/index.html` | Front page with two buttons: board or phone |
| `public/assets/` | Drop art, sound and fonts here (all optional) |
| `test/simulate.js` | Automatic tests, including a full simulated match |
| `OCHE_BIBLE.md` | Master design document for Claude, ChatGPT and Creative Claw |

---

## Put it online (Render), step by step

**1. Make a GitHub repository**
1. Go to github.com, sign in, click **New repository**.
2. Name it `OCHE`. Leave everything else as it is. Click **Create repository**.
3. Click **uploading an existing file**.
4. Unzip `oche.zip` on your computer. Drag **everything inside the `oche` folder** (not the folder itself) into the upload box. Skip the `node_modules` folder if it is there.
5. Click **Commit changes**.

**2. Create the Render service**
1. Go to render.com, sign in, click **New +** then **Web Service**.
2. Pick the `OCHE` repository.
3. Fill in:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance type:** Free
4. Click **Create Web Service**. Wait for the log to say `OCHE running on port ...`.

**3. Play**
1. On the TV or laptop, open `https://<your-render-name>.onrender.com/tv` and press **Start**.
2. On each phone, open `https://<your-render-name>.onrender.com/phone` and type the 4-letter code from the TV.
3. The first person to join is the **captain**. They pick the game and press **Start game**.

> **Free Render note:** the free service goes to sleep after 15 minutes unused. The first visit after that takes up to a minute to wake. Open the TV page a minute before people arrive.

---

## Test on your own computer first (optional)

1. Install Node.js (the LTS version) from nodejs.org.
2. Open a terminal in the `oche` folder.
3. Run `npm install`, then `npm test` (should end with `ALL TESTS PASSED`).
4. Run `npm start` and open `http://localhost:3000/tv`.

> **Motion throwing needs https.** Phones only give motion sensor access on secure (https) addresses. On your home network (`http://`) only **swipe** works. On Render (`https://`) both work.

---

## Playing tips

- **Hold the phone like a TV remote:** top edge pointing at the TV, screen facing up.
- **Recentre** if the crosshair drifts: point at the bullseye and tap Recentre.
- **Calibrate** in Settings: three practice flicks set *your* natural throw as perfect power. Strong and gentle throwers are equally fair after this.
- **Difficulty** per player: Easy (children), Normal, Pro.
- **Captain tools** (button on the captain's phone): undo an accidental dart, skip an absent player, end the game.
- **TV keys:** `M` mutes, `F` goes full screen.

## Safety

Players must keep hold of their phone. The game says so on the throw screen, but say it out loud too. Wrist straps or phone grips are a good idea. Swipe mode exists so nobody has to flick a phone.
