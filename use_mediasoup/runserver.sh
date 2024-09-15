
#https://doc-kurento.readthedocs.io/en/latest/tutorials/js/tutorial-helloworld.html
if [ "x$1" == x ] ;then
	echo $0 www.domain.com
	exit 0;
fi
domain=$1
../certbot.sh $domain
set -x
#git clone https://github.com/mariogasparoni/kurento-mcu-webrtc kurento-mcu-webrtc
git clone https://github.com/versatica/mediasoup-demo.git
git clone https://github.com/versatica/mediasoup.git
cp Dockerfile.server mediasoup-demo/server/Dockerfile
(
cd mediasoup-demo/server/
mkdir -p certs
cat /etc/letsencrypt/live/$domain/fullchain.pem  > certs/_fullchain.pem
cat /etc/letsencrypt/live/$domain/privkey.pem  > certs/_privkey.pem
./docker/build.sh
export MEDIASOUP_SRC=`pwd`/mediasoup
export HTTPS_CERT_FULLCHAIN=/service/certs/_fullchain.pem
export HTTPS_CERT_PRIVKEY=/service/certs/_privkey.pem
./docker/run.sh

)



