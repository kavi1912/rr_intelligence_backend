FROM node:18.20-alpine as build-stage

USER node
RUN mkdir -p /home/node/api
WORKDIR /home/node/api
COPY --chown=node . .

RUN npm install && npm run db:generate && npm run build

FROM node:18.20-alpine as production-stage

RUN mkdir -p /api
WORKDIR /api

COPY --from=build-stage /home/node/api/dist /api
COPY --from=build-stage /home/node/api/package.json /api
COPY --from=build-stage /home/node/api/.env.prod /api/.env
COPY --from=build-stage /home/node/api/prisma /api
COPY --from=build-stage /home/node/api/node_modules/@prisma /api/node_modules/@prisma

RUN npm install --only=production 

EXPOSE 8080/tcp

CMD [ "node", "index.js" ]
