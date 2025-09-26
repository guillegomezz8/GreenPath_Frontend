FROM mirror.gcr.io/library/node:24-slim

WORKDIR /app
COPY . .

EXPOSE 5173
RUN chmod +x ./docker-entrypoint.sh
ENTRYPOINT [ "sh", "./docker-entrypoint.sh" ]


