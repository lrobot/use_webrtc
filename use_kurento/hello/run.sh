

if [ "x$1" == x ] ;then
	echo $0 www.domain.com
	exit 0;
fi


domain=$1

mkdir -p _keys
../../certbot.sh $domain
cat /etc/letsencrypt/live/$domain/fullchain.pem  > _keys/server.crt
cat /etc/letsencrypt/live/$domain/privkey.pem  > _keys/server.key

docker build -f Dockerfile .
echo https://$domain:8443/
docker run --network host -it --rm `docker build -q -f Dockerfile .`

