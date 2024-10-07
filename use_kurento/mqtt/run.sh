docker stop mqtt
docker rm mqtt

#https://doc-kurento.readthedocs.io/en/latest/tutorials/js/tutorial-helloworld.html
if [ "x$1" == x ] ;then
	echo $0 www.domain.com
	exit 0;
fi
domain=$1

mkdir -p _keys
../../certbot.sh $domain

cat /etc/letsencrypt/live/$domain/chain.pem  > _keys/ca.cert.pem
cat /etc/letsencrypt/live/$domain/cert.pem  > _keys/server.cert.pem
cat /etc/letsencrypt/live/$domain/privkey.pem  > _keys/server.key.pem
docker build -f Dockerfile .


docker run --name mqtt -p 1883:1883 -p 1884:1884 -p 8081:8081 -p 8083:8083 -it `docker build -q -f Dockerfile .`
#bytebeamio/rumqttd

