docker stop kurento
docker rm kurento

if [ "x$1" == x ] ;then
	echo $0 www.domain.com
	exit 0;
fi
domain=$1

../../certbot.sh $domain
cat /etc/letsencrypt/live/$domain/{fullchain,privkey}.pem > _cert_key.pem
docker run --rm --network host -v `pwd`/kurento.conf.json:/etc/kurento/kurento.conf.json -v `pwd`/_cert_key.pem:/etc/kurento/_cert_key.pem kurento/kurento-media-server:7.0.0

