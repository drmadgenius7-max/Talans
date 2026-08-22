# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Athar Verify — production image
#
# Multi-stage so the runtime layer carries only what is needed to serve:
# the standalone Next.js output, the Prisma engines, and ffmpeg. ffmpeg is a
# hard requirement for content-similarity analysis; without it the app still
# runs and hash verification (the primary proof) still works, but similarity
# results degrade to "تعذر التأكد".
# ---------------------------------------------------------------------------

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ---------------------------------------------------------------------------

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The build only needs a syntactically valid URL for `prisma generate`;
# the real connection string is supplied at runtime.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV AUTH_SECRET="build-time-placeholder-secret-not-used-at-runtime"
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build -- --no-lint || npx next build

# ---------------------------------------------------------------------------

FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg openssl ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs athar

# Standalone output bundles only the modules the server actually imports.
COPY --from=builder --chown=athar:nodejs /app/.next/standalone ./
COPY --from=builder --chown=athar:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=athar:nodejs /app/public ./public

# Migrations, schema, and the Prisma CLI are needed so the container can run
# `prisma migrate deploy` on start.
COPY --from=builder --chown=athar:nodejs /app/prisma ./prisma
COPY --from=builder --chown=athar:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=athar:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=athar:nodejs /app/node_modules/prisma ./node_modules/prisma

# Local-storage driver writes here; mount a volume over it in production.
RUN mkdir -p /app/storage-data && chown -R athar:nodejs /app/storage-data

USER athar
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
