FROM node:latest
MAINTAINER Alex Kern <alex@pavlovml.com>
 
# install
RUN mkdir -p /filepizza
WORKDIR /filepizza
COPY package.json Makefile ./
RUN make install
COPY . ./

# run
ENV NODE_ENV production
EXPOSE 80
CMD ./dist/index.js
