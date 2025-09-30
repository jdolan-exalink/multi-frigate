# syntax=docker/dockerfile:1
# Multi-Frigate Frontend Production Dockerfile
# 
# Build commands for production:
# - npm run build
# - docker build --pull --rm -t multi-frigate-frontend:latest .
# - docker-compose up --build

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache bash

# Copy package files
COPY package*.json ./

# Remove postinstall script for Docker build
RUN node -e "\
  const fs = require('fs'); \
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); \
  delete pkg.scripts.postinstall; \
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2)); \
  "

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS multi-frigate

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/build/ /usr/share/nginx/html/

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom nginx configuration
COPY ./nginx/default.conf /etc/nginx/conf.d/

# Install bash for environment script
RUN apk add --no-cache bash curl

# Copy environment configuration files
COPY env.sh .env.docker ./

# Make environment script executable and fix line endings
RUN sed -i 's/\r$//' env.sh && chmod +x env.sh

# Create health check endpoint
RUN echo 'server { listen 8080; location /health { return 200 "healthy\n"; add_header Content-Type text/plain; } }' > /etc/nginx/conf.d/health.conf

# Expose ports
EXPOSE 80 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start script that generates env config and starts nginx
CMD ["/bin/bash", "-c", "/app/env.sh && nginx -g \"daemon off;\""]