FROM node:18-alpine3.20
# https://doc-kurento.readthedocs.io/en/latest/tutorials/js/tutorial-helloworld.html
RUN apk add git
RUN npm install -g bower
RUN npm install -g pnpm
RUN npm install -g http-server


COPY webintercom/package.json /app/package.json
ENV PATH="/usr/local/bin:$PATH"
WORKDIR /app
RUN pnpm install

COPY webintercom /app
COPY _keys /app/_keys
RUN ls /app/_keys

CMD pnpm 


