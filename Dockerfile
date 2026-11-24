# ---- Build -------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- Laufzeit ----------------------------------------------------------
FROM node:22-alpine
# perl: für ExifTool (Metadaten, RAW-Vorschau) · libraw-tools: RAW entwickeln
# postgresql17-client: pg_dump für die Sicherung vor Migrationen
RUN apk add --no-cache su-exec perl libraw-tools postgresql17-client
# Wird beim Release von GitHub Actions gesetzt (z.B. v0.2.0)
ARG APP_VERSION=dev
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    BODY_SIZE_LIMIT=210M \
    APP_VERSION=$APP_VERSION

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY docker-entrypoint.sh /usr/local/bin/

RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 3000

HEALTHCHECK --interval=60s --timeout=5s --start-period=30s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
