
docker build -f Dockerfile .
docker run --name nodekas --network host -it --rm `docker build -q -f Dockerfile .`



