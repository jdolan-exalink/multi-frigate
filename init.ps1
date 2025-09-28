# Multi-Frigate Docker Initialization Script for Windows

Write-Host "🚀 Initializing Multi-Frigate with Docker Compose..." -ForegroundColor Green

# Check if Docker is installed
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed. Please install Docker first." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is available
$dockerComposeAvailable = $false
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $dockerComposeAvailable = $true
} else {
    try {
        $null = docker compose version
        $dockerComposeAvailable = $true
    } catch {
        $dockerComposeAvailable = $false
    }
}

if (!$dockerComposeAvailable) {
    Write-Host "❌ Docker Compose is not available. Please install Docker Compose first." -ForegroundColor Red
    exit 1
}

# Create .env file if it doesn't exist
if (!(Test-Path .env)) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ .env file created. Please edit it with your configuration." -ForegroundColor Green
} else {
    Write-Host "ℹ️  .env file already exists." -ForegroundColor Blue
}

# Create DB directory if it doesn't exist
if (!(Test-Path "DB")) {
    Write-Host "📁 Creating DB directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "DB" | Out-Null
}

# Build and start services
Write-Host "🏗️  Building and starting services..." -ForegroundColor Yellow

if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    docker-compose up --build -d
} else {
    docker compose up --build -d
}

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if services are running
$servicesRunning = $false
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $status = docker-compose ps
    if ($status -match "Up") {
        $servicesRunning = $true
    }
} else {
    $status = docker compose ps
    if ($status -match "Up") {
        $servicesRunning = $true
    }
}

if ($servicesRunning) {
    Write-Host "✅ Services are running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access your application:" -ForegroundColor Cyan
    Write-Host "   Frontend: http://localhost" -ForegroundColor White
    Write-Host "   Backend API: http://localhost:4000" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 View logs: docker-compose logs -f" -ForegroundColor Yellow
    Write-Host "🛑 Stop services: docker-compose down" -ForegroundColor Yellow
} else {
    Write-Host "❌ Services failed to start. Check logs with: docker-compose logs" -ForegroundColor Red
    exit 1
}