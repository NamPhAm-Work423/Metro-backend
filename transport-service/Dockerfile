FROM node:18-alpine

# Install wget for health checks
RUN apk add --no-cache wget

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8003

CMD ["npm", "start"] 