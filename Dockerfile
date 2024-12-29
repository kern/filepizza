FROM node:lts-alpine AS builder

RUN apk add --no-cache pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN pnpm build

FROM node:lts-alpine

WORKDIR /app
RUN apk add --no-cache pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

ENV PORT 3000
ENV NODE_ENV production
EXPOSE 3000
CMD pnpm start
