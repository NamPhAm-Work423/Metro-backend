FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src
COPY env.example ./env.example

ENV NODE_ENV=production
ENV SCHEDULER_GRPC_PORT=50060

EXPOSE 50060 8010

CMD ["node", "src/index.js"]


