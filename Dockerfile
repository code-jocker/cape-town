# ---- deps: install production node_modules (native builds: bcrypt, sharp) ----
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime ----
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app

# tini for proper PID1 signal handling (graceful SIGTERM shutdown)
RUN apt-get update && apt-get install -y --no-install-recommends tini curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Uploads live on a volume; make sure the dir exists and is owned by `node`
RUN mkdir -p public/uploads/items public/icons \
  && chown -R node:node /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server/server.js"]
