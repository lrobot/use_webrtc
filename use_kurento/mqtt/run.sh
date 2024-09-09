docker stop mqtt
docker rm mqtt

docker run --name mqtt -p 1883:1883 -p 1884:1884 -it bytebeamio/rumqttd

