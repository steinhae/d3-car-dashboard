FROM node:10-alpine as build

WORKDIR /app
COPY . /app/
RUN apk add --no-cache yarn && yarn install && yarn build:all

FROM alpine:3.8

LABEL AUTHOR="Jan Kuri" AUTHOR_EMAIL="jkuri88@gmail.com"

WORKDIR /app

COPY --from=build /usr/local/bin/node /usr/bin
COPY --from=build /usr/lib/libgcc* /usr/lib/libstdc* /usr/lib/
COPY --from=build /app/dist ./dist

EXPOSE 4090

CMD ["node", "/app/dist/server.js"]
