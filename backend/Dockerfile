FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies including dev (needed for node-pg-migrate)
COPY package*.json ./
RUN npm ci

# Copy source and migrations
COPY src ./src
COPY migrations ./migrations

EXPOSE 4000

# Default command just starts the server; migrations run via separate compose service
CMD ["node","src/server.js"]
