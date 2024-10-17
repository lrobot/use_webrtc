set -x
docker build -f Dockerfile .

while true; do
docker run --name nodekas --network host -it --rm `docker build -q -f Dockerfile .`
read -t 3 -p "Press enter to exit:(timeout in 3s will autorestart)" RESP
if [[ $? -gt 128 ]] ; then
    echo -e "\nTimeout, restarting..."
else
    echo "Response = \"$RESP\""  # adding quotes so empty strings are obvious
    break
fi
done



