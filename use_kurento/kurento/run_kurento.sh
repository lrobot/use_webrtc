docker stop kurento
docker rm kurento
docker run --rm --name kurento --network host -v `pwd`/kurento.conf.json:/etc/kurento/kurento.conf.json -v `pwd`/_cert_key.pem:/etc/kurento/_cert_key.pem kurento/kurento-media-server:7.0.0

