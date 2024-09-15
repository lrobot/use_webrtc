
#https://doc-kurento.readthedocs.io/en/latest/tutorials/js/tutorial-helloworld.html
# if [ "x$1" == x ] ;then
# 	echo $0 www.domain.com
# 	exit 0;
# fi
# domain=$1

set -x
#git clone https://github.com/mariogasparoni/kurento-mcu-webrtc kurento-mcu-webrtc
git clone https://github.com/versatica/mediasoup-demo.git
git clone https://github.com/versatica/mediasoup.git


docker build -t mediasoup-demoapp -f Dockerfile.app .

