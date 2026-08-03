# To use this Dockerfile, you have to set `output: 'standalone'` in your next.config.mjs file.
# From https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile

FROM node:22.17.0-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# pnpm is the only supported package manager — package.json pins it via
# `packageManager`, and pnpm-lock.yaml is the only lockfile in the repo.
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle during `next build`,
# so they have to be present HERE, not just at runtime. Passing them only via
# `environment:` would ship a browser bundle carrying the defaults.
# SUPABASE_URL is needed too: next.config.mjs derives the allowed image host
# from it at build time.
ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_PRODUCT_NAME
ARG NEXT_PUBLIC_DEFAULT_ORG_NAME
ARG NEXT_PUBLIC_ORG_UNIT_NOUN
ARG NEXT_PUBLIC_IMAGE_HOSTS
ARG SUPABASE_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL \
    NEXT_PUBLIC_PRODUCT_NAME=$NEXT_PUBLIC_PRODUCT_NAME \
    NEXT_PUBLIC_DEFAULT_ORG_NAME=$NEXT_PUBLIC_DEFAULT_ORG_NAME \
    NEXT_PUBLIC_ORG_UNIT_NOUN=$NEXT_PUBLIC_ORG_UNIT_NOUN \
    NEXT_PUBLIC_IMAGE_HOSTS=$NEXT_PUBLIC_IMAGE_HOSTS \
    SUPABASE_URL=$SUPABASE_URL

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN corepack enable pnpm && pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Install curl for healthcheck and pm2 for process management
RUN apk add --no-cache curl
RUN npm install -g pm2

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Remove this line if you do not have this folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Create logs directory for application logging
RUN mkdir logs
RUN chown nextjs:nodejs logs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
# PM2 restarts the process automatically if it crashes
CMD HOSTNAME="0.0.0.0" NODE_OPTIONS="--max-old-space-size=1024 --expose-gc" pm2-runtime server.js --max-memory-restart 1G

# Healthcheck - Coolify uses this to monitor app status
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=5 \
  CMD curl -f http://localhost:3000/api/health || exit 1
