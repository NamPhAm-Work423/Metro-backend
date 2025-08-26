###############################
# Stage 1: Install production dependencies
###############################
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

###############################
# Stage 2: Run tests
###############################
FROM node:18-alpine AS test
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=test
RUN npm test -- --runInBand

###############################
# Stage 3: Runtime image
###############################
FROM node:18-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 8001

CMD ["node", "src/index.js"]