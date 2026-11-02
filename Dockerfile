# Pin the Node.js version so builds are reproducible. Bump deliberately for security releases.
ARG NODE_VERSION=24.22.1
# Pin pnpm too: newer releases fail installs on unapproved dependency build scripts.
ARG PNPM_VERSION=10.28.0

# Stage 1: Dependencies
FROM node:${NODE_VERSION}-alpine AS deps
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Need all dependencies for build
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:${NODE_VERSION}-alpine AS builder
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Builds standalone output
RUN pnpm build

# Stage 3: Runner
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

# Only copy standalone output - no need for node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER node
EXPOSE 3000
# Uses standalone server
CMD ["node", "server.js"]
