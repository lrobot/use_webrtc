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
CMD ["npm", "start"]
