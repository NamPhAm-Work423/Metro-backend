###############################
# Stage 1: Install production deps only
###############################
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

###############################
# Stage 2: Run tests (optional target)
###############################
FROM node:18-alpine AS test
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=test
# Run unit tests during image build when targeting this stage
RUN npm test -- --runInBand

###############################
# Stage 3: Runtime image
###############################
FROM node:18-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# PM2 for process management (optional; keeps parity with existing start script)
RUN npm install -g pm2

EXPOSE 8001
# Use pm2-runtime for graceful shutdowns in containers
CMD ["pm2-runtime", "start", "src/index.js", "--name", "auth-service", "--env", "production"]