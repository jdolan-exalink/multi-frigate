#!/bin/bash

# Multi-Frigate Docker Initialization Script

echo "🚀 Initializing Multi-Frigate with Docker Compose..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
else
    echo "ℹ️  .env file already exists."
fi

# Create DB directory if it doesn't exist
if [ ! -d "DB" ]; then
    echo "📁 Creating DB directory..."
    mkdir -p DB
fi

# Build and start services
echo "🏗️  Building and starting services..."
if command -v docker-compose &> /dev/null; then
    docker-compose up --build -d
else
    docker compose up --build -d
fi

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if command -v docker-compose &> /dev/null; then
    if docker-compose ps | grep -q "Up"; then
        echo "✅ Services are running!"
        echo ""
        echo "🌐 Access your application:"
        echo "   Frontend: http://localhost"
        echo "   Backend API: http://localhost:4000"
        echo ""
        echo "📊 View logs: docker-compose logs -f"
        echo "🛑 Stop services: docker-compose down"
    else
        echo "❌ Services failed to start. Check logs with: docker-compose logs"
        exit 1
    fi
else
    if docker compose ps | grep -q "Up"; then
        echo "✅ Services are running!"
        echo ""
        echo "🌐 Access your application:"
        echo "   Frontend: http://localhost"
        echo "   Backend API: http://localhost:4000"
        echo ""
        echo "📊 View logs: docker compose logs -f"
        echo "🛑 Stop services: docker compose down"
    else
        echo "❌ Services failed to start. Check logs with: docker compose logs"
        exit 1
    fi
fi