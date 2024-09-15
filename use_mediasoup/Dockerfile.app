FROM node:18 AS stage-one

# Install DEB dependencies and others.
RUN \
	set -x \
    && apt-get clean \
	&& apt-get update \
	&& apt-get install -y net-tools build-essential python3 python3-pip valgrind

WORKDIR /app

COPY mediasoup-demo/app/package.json .
RUN npm install --legacy-peer-deps
COPY mediasoup-demo/app .
COPY mediasoup-demo/server/config.js /server/config.js
COPY certs /service/certs
ENV HTTPS_CERT_FULLCHAIN=/service/certs/_fullchain.pem
ENV HTTPS_CERT_PRIVKEY=/service/certs/_privkey.pem
CMD ["npm", "start"]
