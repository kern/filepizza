FROM node:lts-alpine

RUN apk add --no-cache pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . ./
RUN pnpm build

ENV NODE_ENV production
EXPOSE 80
CMD node ./dist/index.js
