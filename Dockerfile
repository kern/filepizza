FROM node:latest
MAINTAINER Alex Kern <alex@kern.io>

ENV DISABLE_GA no
 
COPY . ./
RUN npm install && npm run build

ENV NODE_ENV production
EXPOSE 80
CMD node ./dist/index.js
