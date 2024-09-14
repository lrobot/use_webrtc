
#https://doc-kurento.readthedocs.io/en/latest/tutorials/js/tutorial-helloworld.html
if [ "x$1" == x ] ;then
	echo $0 www.domain.com
	exit 0;
fi
domain=$1
../../certbot.sh $domain
set -x
#git clone https://github.com/mariogasparoni/kurento-mcu-webrtc kurento-mcu-webrtc
git clone https://github.com/versatica/mediasoup-demo.git
cp config.example.js mediasoup-demo/server/config.js
(
cd mediasoup-demo/server/
mkdir -p certs
cat /etc/letsencrypt/live/$domain/fullchain.pem  > certs/_fullchain.pem
cat /etc/letsencrypt/live/$domain/privkey.pem  > certs/_privkey.pem
./docker/build.sh
./docker/run.sh

)



