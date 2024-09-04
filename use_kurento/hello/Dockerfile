FROM node:18-alpine3.20
# https://doc-kurento.readthedocs.io/en/latest/tutorials/js/tutorial-helloworld.html
RUN apk add git
RUN npm install -g bower
RUN npm install -g http-server

ENV PATH="/usr/local/bin:$PATH"
COPY helloworld /app
COPY _keys /app/keys
RUN ls /app/keys
WORKDIR /app
RUN set
RUN bower --allow-root install
CMD http-server -p 8443 --ssl --cert /app/keys/server.crt --key /app/keys/server.key

