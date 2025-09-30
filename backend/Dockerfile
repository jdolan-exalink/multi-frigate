# Multi-Frigate Backend Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for multimedia processing and health checks
RUN apk add --no-cache \
    curl \
    ffmpeg \
    sqlite

# Copy package files for better Docker layer caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production || npm install --legacy-peer-deps --production

# Copy application source code
COPY . .

# Create required directories
RUN mkdir -p /app/DB /app/logs

# Set proper permissions
RUN chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose application port
EXPOSE 4000

# Add comprehensive health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
