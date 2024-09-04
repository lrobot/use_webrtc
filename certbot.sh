

[ "x$1" == "x" ] && {
	echo $0 domainname
        exit 0
}

domain=$1
if [ -f /etc/letsencrypt/live/$domain/privkey.pem ] ; then
  echo domain exit $domain
else
  docker run --rm -it --net=host -v /etc/letsencrypt:/etc/letsencrypt -v /var/lib/letsencrypt:/var/lib/letsencrypt -v /var/log/letsencrypt:/var/log/letsencrypt certbot/certbot certonly --standalone --force-renewal --no-eff-email --agree-tos --email lrobot.qq@gmail.com -d $domain
fi

