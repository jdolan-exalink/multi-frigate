# Multi-Frigate: Stack Tecnológico y Despliegue Docker

## 🚀 Resumen del Stack Tecnológico

Multi-Frigate es una aplicación web moderna para gestión centralizada de sistemas de videovigilancia Frigate, construida con tecnologías de vanguardia.

## 📋 Tecnologías Utilizadas

### **Frontend (React + TypeScript)**
- **React 18.2.0** + **TypeScript 4.4.2** - Framework SPA moderno
- **Mantine UI 6.0.16** - Biblioteca completa de componentes UI
- **MobX 6.9.0** + **mobx-react-lite** - Gestión de estado reactivo
- **TanStack React Query 5.21.2** - Cache y sincronización de datos
- **React Router DOM 6.14.1** - Enrutamiento SPA
- **i18next 23.10.1** - Internacionalización (español implementado)
- **Tabler Icons 3.23.0** - Iconografía moderna
- **Monaco Editor** - Editor de código integrado

### **Backend (Node.js)**
- **Express.js 4.18.2** - Framework de servidor web
- **SQLite3 5.1.6** - Base de datos embebida
- **Axios 1.12.2** - Cliente HTTP para proxies
- **http-proxy-middleware 3.0.5** - Proxy para APIs Frigate
- **jsonwebtoken 9.0.2** - Autenticación JWT
- **bcryptjs 2.4.3** - Hashing seguro de contraseñas
- **CORS 2.8.5** - Configuración de políticas de origen

### **Streaming y Video**
- **Video.js 8.10.0** - Reproductor principal con controles avanzados
- **WebRTC** - Streaming de ultra baja latencia (<500ms)
- **MSE (Media Source Extensions)** - H.264/H.265 nativo en navegador
- **JSMpeg Player** - Streaming MJPEG con `@cycjimmy/jsmpeg-player`
- **WebSockets** - Comunicación bidireccional en tiempo real
- **Multiple Codecs**: H.264, H.265, AAC, FLAC, Opus

## 🎯 Funcionalidades Detalladas

### **1. EN VIVO (Live Streaming)**
**Tecnologías:**
- **WebRTC Player**: Streaming P2P con RTCPeerConnection
- **MSE Player**: Media Source Extensions para codecs nativos
- **JSMpeg Player**: MJPEG sobre WebSockets
- **Auto-detection**: Selección automática del mejor protocolo

**Características:**
- Latencia ultra baja (WebRTC < 500ms)
- Soporte multi-cámara simultáneo
- Detección automática de movimiento
- Audio bidireccional (micrófono + altavoces)
- Modo Picture-in-Picture
- Fullscreen optimizado para móviles

### **2. GRABACIONES (Video Playback)**
**Tecnologías:**
- **Video.js**: Reproductor con controles profesionales
- **HLS Support**: HTTP Live Streaming para videos segmentados
- **Date-fns**: Manejo avanzado de fechas y rangos temporales
- **Calendar Navigation**: Navegación temporal intuitiva

**Características:**
- Reproducción de videos H.264/H.265
- Controles de velocidad (0.5x a 8x)
- Salto temporal (±5s, ±10s)
- Descarga de clips con progreso
- Transcoding automático para compatibilidad
- Timeline visual con eventos

### **3. EVENTOS (Event Management)**
**Tecnologías:**
- **React Query**: Cache inteligente y sincronización
- **Accordion Interface**: Organización jerárquica temporal
- **Thumbnail Generation**: Miniaturas automáticas
- **Real-time Updates**: WebSocket para eventos en vivo

**Características:**
- Detección de objetos (personas, vehículos, animales)
- Timeline temporal con filtros avanzados
- Snapshots automáticos de eventos
- Notificaciones en tiempo real
- Tagging y categorización
- Exportación de clips de eventos

## 🐳 Configuración Docker Completa

### **Estructura de Servicios**

#### **Producción (docker-compose.yml)**
```yaml
services:
  backend:          # API Node.js - Puerto 4000
  frontend:         # React/Nginx - Puerto 80
  frontend-dev:     # Desarrollo - Puerto 3000 (opcional)
```

#### **Desarrollo (docker-compose.dev.yml)**
```yaml
services:
  backend-dev:      # API con hot reload
  frontend-dev:     # React con live reload
```

### **Instalación y Despliegue**

#### **1. Preparación del Entorno**
```bash
# Clonar repositorio
git clone <repository-url>
cd multi-frigate

# Configurar variables de entorno
cp .env.example .env
nano .env  # Editar configuración
```

#### **2. Variables de Entorno Críticas**
```bash
# Seguridad
JWT_SECRET=mi-clave-secreta-super-segura-2024

# Integración Frigate
FRIGATE_PROXY=http://backend:4000

# Autenticación Keycloak
OPENID_SERVER=https://auth.midominio.com/realms/frigate
REALM=frigate-realm
CLIENT_ID=multi-frigate-frontend

# Base de datos
DB_PATH=./DB/users.db

# Desarrollo
NODE_ENV=production
CHOKIDAR_USEPOLLING=true  # Para hot reload en Docker
```

#### **3. Despliegue de Producción**
```bash
# Construcción y inicio
docker-compose up -d --build

# Verificación
docker-compose ps
docker-compose logs -f

# Acceso
# Frontend: http://localhost
# API: http://localhost:4000
```

#### **4. Despliegue de Desarrollo**
```bash
# Opción 1: Perfil de desarrollo
docker-compose --profile development up -d --build

# Opción 2: Archivo específico
docker-compose -f docker-compose.dev.yml up -d --build

# Acceso desarrollo: http://localhost:3000
```

### **Arquitectura de Red**
- **Red interna**: `multi-frigate-network`
- **Comunicación**: Servicios por nombre (backend, frontend)
- **Proxy**: Frontend → Backend automático
- **SSL**: Configuración externa (nginx/traefik)

### **Volúmenes Persistentes**
```yaml
volumes:
  - ./DB:/app/DB                    # Base de datos SQLite
  - ./backend/logs:/app/logs        # Logs del backend
  - .:/app                          # Código fuente (desarrollo)
  - /app/node_modules               # Dependencias (desarrollo)
```

### **Health Checks Inteligentes**
```yaml
backend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:4000/api/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s

frontend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

## 🛠️ Comandos de Gestión

### **Operaciones Básicas**
```bash
# Iniciar servicios
docker-compose up -d

# Ver estado
docker-compose ps

# Logs en tiempo real
docker-compose logs -f backend
docker-compose logs -f frontend

# Reiniciar servicio específico
docker-compose restart backend

# Parar todo
docker-compose down
```

### **Desarrollo y Debugging**
```bash
# Reconstruir imágenes
docker-compose build --no-cache

# Acceder a contenedor
docker-compose exec backend bash
docker-compose exec frontend sh

# Instalar dependencias
docker-compose exec frontend-dev npm install nueva-dep
docker-compose restart frontend-dev

# Limpiar sistema
docker-compose down -v
docker system prune -f
```

### **Monitoreo y Mantenimiento**
```bash
# Uso de recursos
docker stats

# Configuración actual
docker-compose config

# Backup de base de datos
docker-compose exec backend cp /app/DB/users.db /app/DB/backup-$(date +%Y%m%d).db

# Verificar conectividad
docker-compose exec frontend curl http://backend:4000/api/health
```

## 🔧 Configuración Avanzada

### **Optimización de Nginx**
```nginx
# Compresión
gzip on;
gzip_types text/plain application/json application/javascript text/css;

# Cache estático
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Proxy para streaming
location /api/ {
    proxy_pass http://backend:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
}
```

### **Variables de Entorno Completas**
```bash
# === SERVIDOR ===
FRONTEND_PORT=80
BACKEND_PORT=4000
DEV_FRONTEND_PORT=3000

# === SEGURIDAD ===
JWT_SECRET=clave-super-secreta-cambiar-en-produccion
JWT_EXPIRATION=24h

# === BASE DE DATOS ===
DB_PATH=./DB/users.db
DB_BACKUP_ENABLED=true

# === AUTENTICACIÓN ===
OPENID_SERVER=https://auth.ejemplo.com/realms/frigate
REALM=frigate-realm
CLIENT_ID=multi-frigate-client
ENABLE_REGISTRATION=false

# === DESARROLLO ===
NODE_ENV=production
DEBUG=multi-frigate:*
CHOKIDAR_USEPOLLING=true
GENERATE_SOURCEMAP=false

# === SISTEMA ===
TZ=America/Argentina/Buenos_Aires
NGINX_WORKER_PROCESSES=auto
```

## 📊 Monitoreo de Producción

### **Métricas Clave**
- CPU/Memoria de contenedores
- Latencia de streaming
- Errores 5xx en backend
- Conectividad con servidores Frigate
- Espacio en disco (base de datos)

### **Alertas Recomendadas**
```bash
# Health check failures
docker-compose ps | grep -v "Up"

# High memory usage
docker stats --format "table {{.Container}}\t{{.MemUsage}}" | grep -E "[5-9][0-9]%|100%"

# Log errors
docker-compose logs backend | grep -i error
```

### **Respaldos Automatizados**
```bash
#!/bin/bash
# backup-script.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec backend cp /app/DB/users.db /app/DB/backup_$DATE.db
find ./DB -name "backup_*.db" -mtime +7 -delete
```

## 🚨 Solución de Problemas

### **Problemas Comunes**
1. **Puerto ocupado**: Cambiar puertos en docker-compose.yml
2. **Permisos**: `sudo chown -R $USER:$USER ./DB`
3. **Variables de entorno**: Verificar sintaxis en .env
4. **Red Docker**: `docker network inspect multi-frigate_multi-frigate-network`

### **Diagnóstico Avanzado**
```bash
# Verificar configuración
docker-compose config

# Test de conectividad interna
docker-compose exec frontend ping backend

# Verificar variables de entorno
docker-compose exec backend env | grep -i frigate

# Logs detallados
docker-compose logs --tail=100 --timestamps backend
```

## 🔄 Actualización y Migración

### **Proceso de Actualización**
```bash
# 1. Backup
./backup-script.sh

# 2. Actualizar código
git pull origin main

# 3. Reconstruir
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 4. Verificar
docker-compose ps
docker-compose logs -f
```

### **Rollback si es Necesario**
```bash
# Volver a versión anterior
git checkout <commit-anterior>
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Restaurar base de datos si es necesario
docker-compose exec backend cp /app/DB/backup_YYYYMMDD.db /app/DB/users.db
docker-compose restart backend
```

## ✅ Lista de Verificación Post-Despliegue

- [ ] Servicios corriendo: `docker-compose ps`
- [ ] Health checks: Todos en "healthy"
- [ ] Frontend accesible en http://localhost
- [ ] API respondiendo en http://localhost:4000/api/health
- [ ] Base de datos inicializada en ./DB/users.db
- [ ] Logs sin errores críticos
- [ ] Conectividad con servidores Frigate
- [ ] Autenticación funcionando (si está configurada)
- [ ] Streaming de video operativo
- [ ] Eventos siendo procesados

¡Multi-Frigate está listo para gestionar tus sistemas de videovigilancia! 🎥📹