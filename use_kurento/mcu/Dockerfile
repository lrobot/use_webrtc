FROM node:18-alpine3.20
# https://doc-kurento.readthedocs.io/en/latest/tutorials/js/tutorial-helloworld.html
RUN apk add git
RUN npm install -g bower
RUN npm install -g pnpm
RUN npm install -g http-server


COPY kurento-mcu-webrtc/package.json /app/package.json
COPY kurento-mcu-webrtc/static/bower.json /app/static/bower.json
ENV PATH="/usr/local/bin:$PATH"
WORKDIR /app
RUN pnpm install

COPY kurento-mcu-webrtc /app
RUN ls /app/keys
COPY _keys /app/keys
RUN ls /app/keys

CMD node server.js  --as_uri https://localhost:8443/ --ws_uri ws://localhost:8888/kurento 

