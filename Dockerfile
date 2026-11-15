# Render Docker runtime matches the already-configured OCHE-MASTER service.
# No supplied gameplay source is altered.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
# Fast, deterministic Bible rules regression checks: no GitHub Actions minutes needed.
RUN node test/bible-regression.js
# Acquire the Creative Claw assets and the two Bible-specified OFL fonts.
RUN node deployment/fetch-media.js
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
