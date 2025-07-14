# Build stage
FROM node:18-alpine as builder

# Install build dependencies for gRPC
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app ./

# Expose port
EXPOSE 3004

# Start application
CMD ["npm", "start"] 