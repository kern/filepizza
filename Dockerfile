FROM node:alpine
MAINTAINER Alex Kern <alex@kern.io>

ENV GA_ACCESS_TOKEN

COPY . ./
RUN npm install && npm run build

ENV NODE_ENV production
EXPOSE 80
CMD node ./dist/index.js
