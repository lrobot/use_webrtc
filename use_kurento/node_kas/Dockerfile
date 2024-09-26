FROM node:18-alpine3.20
# https://doc-kurento.readthedocs.io/en/latest/tutorials/js/tutorial-helloworld.html
RUN apk add git
RUN npm install -g bower
RUN npm install -g pnpm
RUN npm install -g http-server


COPY node_ms/package.json /app/package.json
ENV PATH="/usr/local/bin:$PATH"
WORKDIR /app
RUN pnpm install

COPY node_ms /app

CMD pnpm dev


