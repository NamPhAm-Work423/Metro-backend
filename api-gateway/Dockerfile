FROM node:18-alpine

WORKDIR /app

COPY package.json .

# Install dependencies
RUN npm install

RUN npm install -g pm2

# Copy the rest of the application code
COPY . /app

# Expose the port the app runs on
EXPOSE 8000

# Start the application
CMD ["pm2-runtime", "start", "src/index.js", "--name", "api-gateway", "--env", "production"] 