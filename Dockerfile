FROM node:alpine as builder
LABEL maintainer="Alexander Kern <filepizza@kern.io>"

WORKDIR /root/filepizza

COPY . ./

# copy production node_modules aside
RUN npm ci --only=production
RUN cp -R node_modules prod_node_modules

RUN npm install && npm run build

FROM node:alpine
LABEL maintainer="Alexander Kern <filepizza@kern.io>"
WORKDIR /root/filepizza

# copy production files
COPY --from=builder /root/filepizza/prod_node_modules ./node_modules
COPY --from=builder /root/filepizza/dist ./dist

ENV NODE_ENV production
EXPOSE 80
ENTRYPOINT node ./dist/index.js
