# Render Docker runtime matches the already-configured OCHE-MASTER service.
# No supplied gameplay source is altered.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
# Fast, deterministic Bible rules regression checks: no GitHub Actions minutes needed.
RUN node test/bible-regression.js
# Exercise multiplayer over real WebSockets before this image can go live.
RUN npm test
# Full party-night WebSocket smoke: eight phones, seven modes, reconnects, captain tools.
RUN node test/party-smoke.js
# Prevent broken QR navigation, swipe capture and caller timing from shipping.
RUN node test/frontend-polish.js
# Verify leaving and changing rooms never corrupt an active game.
RUN node test/navigation-smoke.js
# Twelve server-authoritative avatars; distinct casting and skippable walk-ons.
RUN node test/avatar-walkon.js
# Verify the 12 uploaded transparent portraits exactly match the new Bible.
RUN node test/avatar-assets.js
# Exercise every walk-on without skipping, bull-off handover and rematch flow.
RUN node test/full-walkon.js
# Check that every score 0–180 has a recorded caller and the timing slices are valid.
RUN node test/numeric-caller.js
# Confirm a recorded score never speaks twice or overlaps a new-turn reminder.
RUN node test/caller-dedupe.js
# Acquire the Creative Claw assets and the two Bible-specified OFL fonts.
RUN node deployment/fetch-media.js
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
