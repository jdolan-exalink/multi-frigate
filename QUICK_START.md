# 🚀 Comandos de Despliegue Multi-Frigate

## Resumen Ejecutivo

Multi-Frigate está ahora completamente configurado para Docker Compose con:
- ✅ **Frontend React**: Puerto 80 (producción) / 3000 (desarrollo)
- ✅ **Backend Node.js**: Puerto 4000
- ✅ **Base de datos SQLite**: Persistente en ./DB
- ✅ **Health checks**: Automáticos con reinicio
- ✅ **Desarrollo**: Hot reload configurado

## 🎯 Comandos Rápidos

### **Despliegue de Producción**
```bash
# 1. Configurar entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 2. Desplegar
docker-compose up -d --build

# 3. Verificar
docker-compose ps
docker-compose logs -f

# 4. Acceder
# http://localhost (Frontend)
# http://localhost:4000 (API)
```

### **Desarrollo con Hot Reload**
```bash
# Opción A: Perfil de desarrollo
docker-compose --profile development up -d --build

# Opción B: Archivo específico
docker-compose -f docker-compose.dev.yml up -d --build

# Acceso: http://localhost:3000
```

## 📊 Tecnologías del Stack

### **Frontend (React + TypeScript)**
- React 18.2.0 + TypeScript
- Mantine UI 6.0.16 (componentes)
- MobX + React Query (estado)
- i18next (español implementado)
- Video.js + WebRTC + MSE + JSMpeg

### **Backend (Node.js)**
- Express.js 4.18.2
- SQLite3 5.1.6
- JWT + bcrypt (seguridad)
- Proxy middleware para Frigate

### **Funcionalidades**
1. **EN VIVO**: WebRTC, MSE, JSMpeg streaming
2. **GRABACIONES**: Video.js con HLS
3. **EVENTOS**: Timeline con detección de objetos

## 🛠️ Gestión de Servicios

```bash
# Ver estado
docker-compose ps

# Logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Reiniciar
docker-compose restart backend

# Parar
docker-compose down

# Limpiar y reconstruir
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 🔧 Variables de Entorno Críticas

```bash
# .env file
JWT_SECRET=clave-super-secreta
FRIGATE_PROXY=http://backend:4000
OPENID_SERVER=https://auth.ejemplo.com/realms/frigate
REALM=frigate-realm
CLIENT_ID=multi-frigate-client
```

## 📋 Lista de Verificación

- [ ] Docker y Docker Compose instalados
- [ ] Puertos 80, 4000, 3000 disponibles
- [ ] Archivo .env configurado
- [ ] `docker-compose config` sin errores
- [ ] Servicios en estado "healthy"
- [ ] Frontend accesible
- [ ] API respondiendo en /api/health

## 🚨 Solución Rápida de Problemas

```bash
# Verificar configuración
docker-compose config

# Verificar conectividad
docker-compose exec frontend curl http://backend:4000/api/health

# Ver logs de errores
docker-compose logs backend | grep -i error

# Reinicio completo
docker-compose down -v && docker-compose up -d --build
```

¡Multi-Frigate está listo para gestionar tus cámaras Frigate! 🎥