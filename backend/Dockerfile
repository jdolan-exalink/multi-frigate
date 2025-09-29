FROM node:20-alpine
WORKDIR /app

# Install curl and ffmpeg for healthcheck and transcoding
RUN apk add --no-cache curl ffmpeg

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production || npm install --legacy-peer-deps --production

# Copy application code
COPY . .

# Create directory for database if it doesn't exist
RUN mkdir -p /app/DB

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
