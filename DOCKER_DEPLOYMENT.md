# Docker Compose Deployment Guide

This guide explains how to deploy the Multi-Frigate application using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your system
- At least 2GB of available RAM
- Ports 80 and 4000 available on your host

## Quick Start

1. **Clone the repository and navigate to the project directory:**
   ```bash
   git clone <repository-url>
   cd multi-frigate
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build and start the services:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - Frontend: http://localhost
   - Backend API: http://localhost:4000

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

- `JWT_SECRET`: Secret key for JWT token signing
- `FRIGATE_PROXY`: Backend URL (use `http://backend:4000` for Docker Compose)
- `OPENID_SERVER`: Your Keycloak/OpenID server URL
- `REALM`: Keycloak realm name
- `CLIENT_ID`: Frontend client ID in Keycloak

### Database

The application uses SQLite database stored in the `./DB` directory. The database file will be created automatically on first run.

## Development Mode

For development with hot reload:

```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

This will:
- Mount source code volumes for live reloading
- Use development servers instead of production builds
- Expose frontend on port 3000

## Production Deployment

For production deployment:

```bash
# Build for production
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Services

### Backend Service
- **Port**: 4000
- **Health Check**: `/api/health`
- **Database**: SQLite (persistent volume)
- **Features**: REST API, authentication, Frigate proxy

### Frontend Service
- **Port**: 80
- **Framework**: React with Nginx
- **Features**: Web UI, camera management, live streaming

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 80 and 4000 are available
2. **Database permissions**: Ensure write permissions on `./DB` directory
3. **Build failures**: Clear Docker cache with `docker system prune`

### Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f
```

### Database Issues

If you need to reset the database:
```bash
docker-compose down
rm -rf ./DB/users.db
docker-compose up --build
```

## Security Considerations

- Change the default `JWT_SECRET` in production
- Configure proper firewall rules
- Use HTTPS in production (consider adding a reverse proxy)
- Regularly update Docker images

## Backup

To backup the database:
```bash
docker-compose down
cp ./DB/users.db ./DB/users.db.backup
docker-compose up -d
```