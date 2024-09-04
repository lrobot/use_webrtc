FROM node:18-alpine3.20
# https://doc-kurento.readthedocs.io/en/latest/tutorials/js/tutorial-helloworld.html
RUN apk add git
RUN npm install -g bower
RUN npm install -g pnpm
RUN npm install -g http-server

COPY _keys /app/keys
RUN mkdir -p /app/keys/test
RUN ls /app/keys

COPY kurento-mcu-webrtc/package.json /app/package.json
COPY kurento-mcu-webrtc/static/bower.json /app/static/bower.json
ENV PATH="/usr/local/bin:$PATH"
WORKDIR /app
RUN pnpm install

COPY kurento-mcu-webrtc/server.js /app/server.js
COPY kurento-mcu-webrtc/static/index.html /app/static/index.html
COPY kurento-mcu-webrtc/static/js/index.js /app/static/js/index.js
COPY kurento-mcu-webrtc/static/css/index.css /app/static/css/index.css


CMD node server.js  --as_uri https://localhost:8443/ --ws_uri ws://localhost:8888/kurento 

