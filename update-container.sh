docker stop $(sudo docker ps -aq  --filter "ancestor=ontimond/alkanoid-bot")
docker rm $(sudo docker ps -aq  --filter "ancestor=ontimond/alkanoid-bot")
docker run --name alkanoid-bot-container --env-file ./.env -d ontimond/alkanoid-bot:$OSTYPE
