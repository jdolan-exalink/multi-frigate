import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Función para verificar si un servidor Frigate está activo
async function checkFrigateServerState(host) {
  try {
    const response = await axios.get(`${host}/api/version`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.error(`Error checking Frigate server ${host}:`, error.message);
    return false;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para obtener el hostname de una URL
function mapHostToHostname(host) {
  if (!host?.host) return undefined;
  try {
    const url = new URL(host.host);
    return url.host;
  } catch (error) {
    console.error('Error parsing host URL:', error);
    return undefined;
  }
}

const DB_PATH = path.join(__dirname, './DB/users.db');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const PORT = process.env.PORT || 4000;

const db = new sqlite3.Database(DB_PATH);

// Crear tabla de usuarios si no existe
const createTable = `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL
);`;
db.run(createTable, err => {
  if (err) console.error('Error creando tabla:', err);
  // Crear usuario admin por defecto si no existe
  db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
    if (!row) {
      const hash = bcrypt.hashSync('admin123', 10);
      db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
    }
  });
});

const app = express();
app.use(cors());
app.use(express.json());

// Función para hacer proxy de peticiones a Frigate
async function proxyFrigateRequest(hostUrl, endpoint, req, res) {
  try {
    const frigateUrl = `${hostUrl}${endpoint}`;
    console.log(`Proxying request to: ${frigateUrl}`);
    
    // Determinar si es una petición de video o stream
    const isVideoOrStream = endpoint.includes('/video') || 
                          endpoint.includes('/feed') || 
                          endpoint.includes('/clips') || 
                          endpoint.includes('/recordings') || 
                          endpoint.includes('/latest.jpg') ||
                          endpoint.includes('.m3u8') ||
                          endpoint.includes('.ts');

    // Determinar si es una petición de resumen de grabaciones
    const isRecordingSummary = endpoint.includes('/recordings/summary');

    const response = await axios({
      method: req.method,
      url: frigateUrl,
      data: req.body,
      params: req.query,
      headers: {
        ...req.headers,
        'Accept': req.headers.accept,
        'Range': req.headers.range,
        'If-None-Match': req.headers['if-none-match'],
        'If-Modified-Since': req.headers['if-modified-since']
      },
      responseType: isVideoOrStream ? 'stream' : 'json',
      maxRedirects: 5,
      timeout: isVideoOrStream ? 30000 : (isRecordingSummary ? 30000 : 5000)
    });

    // Copiar los headers relevantes de la respuesta
    Object.keys(response.headers).forEach(header => {
      try {
        if (header.toLowerCase() !== 'content-encoding') {
          res.setHeader(header, response.headers[header]);
        }
      } catch (e) {
        console.warn(`Could not set header ${header}:`, e.message);
      }
    });

    if (isVideoOrStream) {
      response.data.pipe(res);
    } else {
      // Si la respuesta es un array vacío o null, enviar array vacío
      if (response.data === null || (Array.isArray(response.data) && response.data.length === 0)) {
        res.json([]);
      } else {
        res.json(response.data);
      }
    }
  } catch (error) {
    console.error(`Error proxying request to ${hostUrl}${endpoint}:`, error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
}

// Middleware para rutas protegidas
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token provided' });
  
  const token = auth.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Invalid token format' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// --- RUTAS DE LA API ---

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, username: user.username, role: user.role });
  });
});

// Get cameras by host ID
app.get('/apiv1/cameras/host/:hostId', async (req, res) => {
  const hostId = req.params.hostId;
  console.log('getCamerasByHostId called for hostId:', hostId);
  const host = mockHosts.find(h => h.id === hostId);
  
  if (!host) {
    console.log('Host not found');
    return res.status(404).json({ error: 'Host not found' });
  }

  console.log('Host found:', host);
  try {
    // Get config from Frigate server to get cameras
    console.log('Fetching config from:', `${host.host}/api/config`);
    const response = await axios.get(`${host.host}/api/config`);
    const config = response.data;
    console.log('Config cameras:', Object.keys(config.cameras));
    
    // Extract cameras from config
    const cameras = Object.keys(config.cameras).map(cameraName => {
      const cameraConfig = config.cameras[cameraName];
      return {
        id: `${host.id}_${cameraName}`,
        name: cameraName,
        frigateHost: host,
        config: cameraConfig,
        enabled: cameraConfig.enabled !== false // if undefined, assume true
      };
    });
    console.log('Cameras returned:', cameras.length);
    res.json(cameras);
  } catch (error) {
    console.error(`Error getting cameras from ${host.host}:`, error.message);
    res.status(500).json({ error: 'Error fetching cameras from Frigate server' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Middleware de autenticación para mock endpoints
app.use('/apiv1', authMiddleware);

// Mock data para endpoints Frigate
const mockConfig = [{ key: 'example', value: 'mock config' }];

// Mock data para estadísticas del sistema
const mockStats = {
  service: {
    version: '0.12.0',
    latest_version: '0.12.0',
    storage: {
      path: '/media/frigate/clips',
      total: 500000000000,
      used: 125000000000,
      free: 375000000000,
      mount_type: 'ext4',
    },
    temps: {
      gpu_temp: 45.5,
      cpu_temp: 38.2
    },
    uptime: 345600,
    cpu_usages: [25.5, 30.2, 15.8],
    gpu_usages: [45.2],
    processes: {
      detect: {
        cpu: 15.5,
        mem: 8.2,
        gpu: 35.2,
        pid: 1234
      },
      ffmpeg: {
        cpu: 12.3,
        mem: 5.6,
        gpu: 0,
        pid: 1235
      }
    }
  },
  cameras: {
    camera1: {
      camera_fps: 25.5,
      process_fps: 22.3,
      detection_fps: 15.2,
      pid: 1236
    }
  }
};
const mockHosts = [
  {
    id: '1',
    createAt: new Date().toISOString(),
    updateAt: new Date().toISOString(),
    name: 'Casa',
    host: 'http://10.1.1.252:5000',
    enabled: true,
    state: true
  }
];
const mockRoles = [{ id: '1', name: 'admin' }, { id: '2', name: 'user' }, { id: '3', name: 'birdseye' }];
const mockTags = [
  { 
    id: '1', 
    value: 'Tag 1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'admin'
  },
  { 
    id: '2', 
    value: 'Tag 2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'admin'
  },
  { 
    id: '3', 
    value: 'Tag 3',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'admin'
  }
];

// Helper function to get all cameras from all active hosts
async function getAllCameras() {
  let allCameras = [];
  console.log('getAllCameras called, mockHosts:', mockHosts);
  for (const host of mockHosts) {
    console.log('Processing host:', host);
    if (host.enabled) {
      console.log('Host enabled, fetching config from:', host.host);
      try {
        const response = await axios.get(`${host.host}/api/config`);
        const config = response.data;
        console.log('Config received:', Object.keys(config.cameras));
        const hostCameras = Object.keys(config.cameras).map(cameraName => {
          const cameraConfig = config.cameras[cameraName];
          return {
            id: `${host.id}_${cameraName}`,
            name: cameraName,
            frigateHost: host,
            enabled: cameraConfig.enabled !== false, // if undefined, assume true
            config: cameraConfig
          };
        });
        allCameras = [...allCameras, ...hostCameras];
        console.log('Cameras added:', hostCameras.length);
      } catch (error) {
        console.error(`Error getting cameras from ${host.host}:`, error.message);
      }
    } else {
      console.log('Host not enabled:', host);
    }
  }
  console.log('Total cameras:', allCameras.length);
  return allCameras;
}

// Endpoints mock Frigate
app.get('/apiv1/tags', (req, res) => {
  console.log('GET /apiv1/tags - Response:', mockTags);
  res.json({ data: mockTags });
});
app.get('/apiv1/config', (req, res) => res.json(mockConfig));
app.get('/apiv1/config/:key', (req, res) => res.json({ key: req.params.key, value: 'mock value' }));
app.get('/apiv1/frigate-hosts', (req, res) => {
  console.log('GET /apiv1/frigate-hosts - Response:', mockHosts);
  res.json({ data: mockHosts });
});
app.get('/apiv1/frigate-hosts/:id', (req, res) => res.json(mockHosts[0]));

// PUT endpoint para actualizar hosts
app.put('/apiv1/frigate-hosts', async (req, res) => {
  console.log('PUT /apiv1/frigate-hosts - Request:', req.body);
  const updatedHosts = req.body;
  
  // Verificar el estado de cada servidor
  for (let host of updatedHosts) {
    if (host.enabled) {
      host.state = await checkFrigateServerState(host.host);
    } else {
      host.state = false;
    }
  }

  // En una implementación real, aquí guardarías los hosts en la base de datos
  // Por ahora, solo actualizamos el mock data
  mockHosts.length = 0;
  mockHosts.push(...updatedHosts);
  res.json(mockHosts);
});

// DELETE endpoint para eliminar hosts
app.delete('/apiv1/frigate-hosts', (req, res) => {
  console.log('DELETE /apiv1/frigate-hosts - Request:', req.body);
  const hostsToDelete = req.body;
  // En una implementación real, aquí eliminarías los hosts de la base de datos
  // Por ahora, solo actualizamos el mock data
  hostsToDelete.forEach(hostToDelete => {
    const index = mockHosts.findIndex(host => host.id === hostToDelete.id);
    if (index !== -1) {
      mockHosts.splice(index, 1);
    }
  });
  res.json({ success: true });
});
app.get('/apiv1/cameras', async (req, res) => {
  try {
    const allCameras = await getAllCameras();
    console.log('GET /apiv1/cameras - Response:', allCameras);
    res.json(allCameras);
  } catch (error) {
    console.error('Error getting cameras:', error);
    res.status(500).json({ error: 'Error getting cameras' });
  }
});
app.get('/apiv1/cameras/:id', async (req, res) => {
  try {
    const allCameras = await getAllCameras();
    const camera = allCameras.find(c => c.id === req.params.id);
    if (camera) {
      res.json(camera);
    } else {
      res.status(404).json({ error: 'Camera not found' });
    }
  } catch (error) {
    console.error('Error getting camera by id:', error);
    res.status(500).json({ error: 'Error getting camera' });
  }
});
app.get('/apiv1/roles', (req, res) => {
  console.log('GET /apiv1/roles - Response:', mockRoles);
  res.json(mockRoles);
});
app.get('/apiv1/config/admin', (req, res) => res.json({ key: 'adminRole', value: 'admin', type: 'string', desc: 'desc' }));

// Proxy para peticiones a Frigate
app.all('/proxy/:hostName/*', async (req, res) => {
  const hostName = req.params.hostName;
  const host = mockHosts.find(h => h.name === hostName || mapHostToHostname(h) === hostName);
  
  if (!host) {
    return res.status(404).json({ error: 'Host not found' });
  }

  if (!host.enabled) {
    return res.status(403).json({ error: 'Host is disabled' });
  }

  const endpoint = req.url.replace(`/proxy/${hostName}`, '');
  await proxyFrigateRequest(host.host, endpoint, req, res);
});

// Endpoint para obtener información de almacenamiento
app.get('/proxy/:hostName/api/recordings/storage', (req, res) => {
  console.log('GET /proxy/:hostName/api/recordings/storage - Response:', mockStats.service.storage);
  res.json(mockStats.service.storage);
});

// Endpoint para obtener información de vainfo
app.get('/proxy/:hostName/api/vainfo', (req, res) => {
  res.json({
    vendor: 'Intel',
    version: '1.0',
    capabilities: ['h264', 'h265']
  });
});

// Endpoint para obtener información ffprobe
app.get('/proxy/:hostName/api/ffprobe', (req, res) => {
  res.json([{
    width: 1920,
    height: 1080,
    codec: 'h264',
    fps: 30
  }]);
});

// Endpoint para verificar el token y obtener información del usuario
// Endpoint para verificar el token y obtener información del usuario
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

// Endpoint para verificar el estado de autenticación
app.get('/api/auth/check', authMiddleware, (req, res) => {
  res.json({ authenticated: true });
});

// --- SERVIR FRONTEND ---

// Solo servir archivos estáticos del frontend en producción cuando el directorio build existe
const buildPath = path.join(__dirname, '../build');
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && fs.existsSync(buildPath)) {
  // Servir archivos estáticos del frontend (después de las rutas API)
  app.use(express.static(buildPath));

  // Ruta catch-all para el frontend - debe ir al final
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else if (!isProduction) {
  // En desarrollo, informar que el frontend corre en otro puerto
  app.get('*', (req, res) => {
    res.status(200).json({
      message: 'Frontend is running on port 3000 in development mode',
      frontend_url: 'http://localhost:3000'
    });
  });
}

const server = app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

const wsProxy = createProxyMiddleware({
  target: 'ws://localhost:5000', // Target provisional, se cambiará dinámicamente
  ws: true,
  router: (req) => {
    const urlParts = req.url.split('/');
    const hostName = urlParts[2];
    const host = mockHosts.find(h => h.name === hostName || mapHostToHostname(h) === hostName);
    if (host) {
      const targetUrl = new URL(host.host);
      return `${targetUrl.protocol === 'https:' ? 'wss' : 'ws'}://${targetUrl.host}`;
    }
    return 'ws://localhost:5000'; // Fallback
  },
  pathRewrite: (path, req) => {
    const urlParts = req.url.split('/');
    const hostName = urlParts[2];
    return path.replace(`/proxy-ws/${hostName}`, '');
  },
  logLevel: 'debug'
});

app.use('/proxy-ws', wsProxy);

server.on('upgrade', wsProxy.upgrade);
