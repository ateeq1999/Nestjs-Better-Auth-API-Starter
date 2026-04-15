# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Install dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-slim AS deps

# corepack ships with Node.js 24 — use it to activate pnpm without a global install
RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Build
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-slim AS builder

RUN corepack enable pnpm

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — Production runtime (lean image)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-slim AS runner

RUN corepack enable pnpm

WORKDIR /app

ENV NODE_ENV=production

# Install production-only dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Run as non-root user for security
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nestjs
USER nestjs

EXPOSE 5555

CMD ["node", "dist/main"]
