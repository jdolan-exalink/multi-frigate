# Multi-Frigate

A modern web interface for managing multiple Frigate NVR instances with advanced camera management, live streaming, and recording features.

## Features
- Main page: Filter cameras using a search function.
- Main page: Filter cameras by host.
- Main page: Automatically update images.
- Main page: Optimized for mobile view.
- Live camera view page.
- Recordings page: Filter recordings by host, camera, and date.
- Recordings page: Options to play, download, and share videos.
- Recordings player page.
- Events page: Filter recordings by host, camera, and date and time.
- Access settings page: Configure which cameras are allowed and which are not.
- Frigate config editor page: Save and restart configuration using JSON schema from the host.
- Frigate system page: Display camera capture, ffmpeg, and decode stats. Show camera recordings storage stats.
- Frigate mask camera editor: Add, edit, delete camera masks.
- Admin pages access control: Restrict access to certain pages for administrators only.
- Keycloak OpenID provider authorization using JWT tokens.

## Quick Start with Docker Compose

### Prerequisites
- Docker and Docker Compose installed
- At least 2GB RAM available
- Ports 80 and 4000 available

### Setup
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd multi-frigate
   ```

2. **Configure environment:**
   ```bash
   # Windows
   .\init.ps1

   # Linux/Mac
   ./init.sh
   ```

3. **Or manual setup:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   docker-compose up --build -d
   ```

4. **Access the application:**
   - Frontend: http://localhost
   - Backend API: http://localhost:4000

## Development

### Local Development
```bash
# Install dependencies
npm install
cd backend && npm install

# Start development servers
npm run dev    # Frontend on :3000
# In another terminal:
cd backend && npm run dev  # Backend on :4000
```

### Docker Development
```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

## Configuration

### Environment Variables
See `.env.example` for all available configuration options. Key variables:

- `JWT_SECRET`: Secret key for JWT tokens
- `FRIGATE_PROXY`: Backend API URL
- `OPENID_SERVER`: Keycloak server URL
- `REALM`: Keycloak realm
- `CLIENT_ID`: Frontend client ID

## Deployment

### Production
```bash
docker-compose up --build -d
```

### With Reverse Proxy (HTTPS)
Use a reverse proxy like Nginx or Traefik in front of the application for SSL termination.

## API Documentation

The backend provides REST API endpoints for:
- Authentication (`/api/login`)
- Camera management (`/apiv1/cameras`)
- Frigate proxy (`/proxy/:hostName/*`)
- Health checks (`/api/health`)

## Troubleshooting

See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for detailed troubleshooting guides.

## Screenshots