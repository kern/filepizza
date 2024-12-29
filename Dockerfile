FROM node:lts-alpine

RUN apk add --no-cache pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . ./
RUN pnpm build

ENV PORT 3000
ENV NODE_ENV production
EXPOSE 3000
CMD pnpm start
