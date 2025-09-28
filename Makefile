# Multi-Frigate Docker Makefile

.PHONY: help build up down logs clean dev prod init

# Default target
help:
	@echo "Multi-Frigate Docker Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev        - Start development environment with hot reload"
	@echo "  make build-dev  - Build development containers"
	@echo ""
	@echo "Production:"
	@echo "  make prod       - Start production environment"
	@echo "  make build      - Build production containers"
	@echo ""
	@echo "Management:"
	@echo "  make up         - Start all services"
	@echo "  make down       - Stop all services"
	@echo "  make logs       - Show logs from all services"
	@echo "  make logs-f     - Follow logs from all services"
	@echo "  make clean      - Remove containers and volumes"
	@echo "  make init       - Initialize environment (.env file)"
	@echo ""

# Initialize environment
init:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✅ .env file created from template"; \
	else \
		echo "ℹ️  .env file already exists"; \
	fi
	@if [ ! -d "DB" ]; then \
		mkdir -p DB; \
		echo "📁 DB directory created"; \
	fi

# Build production containers
build:
	docker-compose build

# Build development containers
build-dev:
	docker-compose -f docker-compose.yml -f docker-compose.override.yml build

# Start production environment
prod: init
	docker-compose up -d

# Start development environment
dev: init
	docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Start services
up: init
	docker-compose up -d

# Stop services
down:
	docker-compose down

# Show logs
logs:
	docker-compose logs

# Follow logs
logs-f:
	docker-compose logs -f

# Clean up
clean:
	docker-compose down -v --remove-orphans
	docker system prune -f

# Full rebuild
rebuild: clean
	docker-compose build --no-cache
	docker-compose up -d