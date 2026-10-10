# Dockerfile for Next.js App
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files (every workspace manifest the app depends on must be
# present or pnpm install fails to resolve workspace:* dependencies)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/app/package.json ./apps/app/
COPY packages/design-system/package.json ./packages/design-system/
COPY turbo.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/app/node_modules ./apps/app/node_modules
COPY --from=deps /app/packages/design-system/node_modules ./packages/design-system/node_modules

# Copy source code
COPY . .

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Build the Next.js app and its workspace dependencies (turbo's build task
# dependsOn ^build, so @repo/design-system dist/ is produced first)
RUN pnpm exec turbo run build --filter=@repo/app

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/apps/app/public ./apps/app/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/app/.next/static ./apps/app/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/app/server.js"]
