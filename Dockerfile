# Stage 1: Dependencies
FROM node:lts-alpine AS deps
RUN apk add --no-cache pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Need all dependencies for build
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:lts-alpine AS builder
RUN apk add --no-cache pnpm
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Builds standalone output
RUN pnpm build

# Stage 3: Runner
FROM node:lts-alpine AS runner
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
