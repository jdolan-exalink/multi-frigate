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
import { spawn } from 'child_process';

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

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../DB/users.db');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const PORT = process.env.PORT || 4000;

// Asegurar que el directorio DB existe
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`Initializing database at: ${DB_PATH}`);

// Intentar dar permisos al archivo de DB si existe
if (fs.existsSync(DB_PATH)) {
  try {
    fs.chmodSync(DB_PATH, 0o666);
  } catch (err) {
    console.warn('Could not change database file permissions:', err.message);
  }
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    console.error('Database path:', DB_PATH);
    console.error('Directory exists:', fs.existsSync(dbDir));
    console.error('File exists:', fs.existsSync(DB_PATH));
    
    // Intentar crear la base de datos en un directorio temporal si falla
    const tempDbPath = '/tmp/users.db';
    console.log('Trying temporary database at:', tempDbPath);
    
    const tempDb = new sqlite3.Database(tempDbPath, (tempErr) => {
      if (tempErr) {
        console.error('Error opening temporary database:', tempErr);
        process.exit(1);
      } else {
        console.log('Using temporary database - data will not persist!');
        // Reemplazar la instancia de db
        Object.setPrototypeOf(db, tempDb);
        Object.assign(db, tempDb);
      }
    });
  } else {
    console.log('Database connection established successfully');
  }
});

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
    Exterior: {
      camera_fps: 25.5,
      process_fps: 22.3,
      detection_fps: 15.2,
      pid: 1236
    },
    Interior: {
      camera_fps: 30.0,
      process_fps: 28.5,
      detection_fps: 18.0,
      pid: 1237
    },
    Jardin: {
      camera_fps: 20.0,
      process_fps: 18.2,
      detection_fps: 12.5,
      pid: 1238
    }
  }
};
const mockEvents = [
  // Eventos para Patio_Luz
  {
    id: '1759260200.123456-event1',
    camera: 'Patio_Luz',
    start_time: 1759260200.123456,
    end_time: 1759260220.654321,
    label: 'person',
    sub_label: null,
    top_score: 0.89,
    false_positive: false,
    zones: ['front_yard'],
    thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    has_clip: true,
    has_snapshot: true,
    score: 0.89,
    area: 15000,
    ratio: 1.2,
    region: [100, 200, 300, 400],
    box: [150, 250, 200, 150],
    current_zones: ['front_yard'],
    entered_zones: ['front_yard'],
    thumbnail_url: '/api/events/1759260200.123456-event1/snapshot.jpg'
  },
  {
    id: '1759260400.234567-event4',
    camera: 'Patio_Luz',
    start_time: 1759260400.234567,
    end_time: 1759260415.345678,
    label: 'car',
    sub_label: null,
    top_score: 0.85,
    false_positive: false,
    zones: ['front_yard'],
    thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    has_clip: true,
    has_snapshot: true,
    score: 0.85,
    area: 20000,
    ratio: 1.5,
    region: [120, 220, 320, 420],
    box: [170, 270, 220, 170],
    current_zones: ['front_yard'],
    entered_zones: ['front_yard'],
    thumbnail_url: '/api/events/1759260400.234567-event4/snapshot.jpg'
  },
  {
    id: '1759260500.345678-event5',
    camera: 'Patio_Luz',
    start_time: 1759260500.345678,
    end_time: 1759260525.456789,
    label: 'dog',
    sub_label: null,
    top_score: 0.78,
    false_positive: false,
    zones: ['front_yard'],
    thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    has_clip: true,
    has_snapshot: true,
    score: 0.78,
    area: 12000,
    ratio: 1.1,
    region: [90, 190, 290, 390],
    box: [140, 240, 190, 140],
    current_zones: ['front_yard'],
    entered_zones: ['front_yard'],
    thumbnail_url: '/api/events/1759260500.345678-event5/snapshot.jpg'
  },
  // Eventos para Patio
  {
    id: '1759260300.987654-event2',
    camera: 'Patio',
    start_time: 1759260300.987654,
    end_time: 1759260315.111222,
    label: 'car',
    sub_label: null,
    top_score: 0.92,
    false_positive: false,
    zones: ['driveway'],
    thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    has_clip: true,
    has_snapshot: true,
    score: 0.92,
    area: 25000,
    ratio: 1.8,
    region: [200, 300, 400, 500],
    box: [250, 350, 300, 200],
    current_zones: ['driveway'],
    entered_zones: ['driveway'],
    thumbnail_url: '/api/events/1759260300.987654-event2/snapshot.jpg'
  },
  {
    id: '1759260450.111222-event6',
    camera: 'Patio',
    start_time: 1759260450.111222,
    end_time: 1759260470.222333,
    label: 'person',
    sub_label: null,
    top_score: 0.88,
    false_positive: false,
    zones: ['driveway'],
    thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    has_clip: true,
    has_snapshot: true,
    score: 0.88,
    area: 18000,
    ratio: 1.3,
    region: [180, 280, 380, 480],
    box: [230, 330, 280, 180],
    current_zones: ['driveway'],
    entered_zones: ['driveway'],
    thumbnail_url: '/api/events/1759260450.111222-event6/snapshot.jpg'
  },
  // Eventos para Portones
  {
    id: '1759260350.555666-event3',
    camera: 'Portones',
    start_time: 1759260350.555666,
    end_time: 1759260365.777888,
    label: 'person',
    sub_label: null,
    top_score: 0.85,
    false_positive: false,
    zones: ['living_room'],
    thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    has_clip: true,
    has_snapshot: true,
    score: 0.85,
    area: 12000,
    ratio: 1.1,
    region: [50, 100, 250, 300],
    box: [100, 150, 180, 120],
    current_zones: ['living_room'],
    entered_zones: ['living_room'],
    thumbnail_url: '/api/events/1759260350.555666-event3/snapshot.jpg'
  },
  {
    id: '1759260150.666777-event7',
    camera: 'Portones',
    start_time: 1759260150.666777,
    end_time: 1759260170.777888,
    label: 'car',
    sub_label: null,
    top_score: 0.91,
    false_positive: false,
    zones: ['entrance'],
    thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    has_clip: true,
    has_snapshot: true,
    score: 0.91,
    area: 22000,
    ratio: 1.6,
    region: [60, 110, 260, 310],
    box: [110, 160, 190, 130],
    current_zones: ['entrance'],
    entered_zones: ['entrance'],
    thumbnail_url: '/api/events/1759260150.666777-event7/snapshot.jpg'
  },
  {
    id: '1759260250.777888-event8',
    camera: 'Portones',
    start_time: 1759260250.777888,
    end_time: 1759260275.888999,
    label: 'truck',
    sub_label: null,
    top_score: 0.87,
    false_positive: false,
    zones: ['entrance'],
    thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    has_clip: true,
    has_snapshot: true,
    score: 0.87,
    area: 28000,
    ratio: 2.1,
    region: [40, 90, 240, 290],
    box: [90, 140, 170, 110],
    current_zones: ['entrance'],
    entered_zones: ['entrance'],
    thumbnail_url: '/api/events/1759260250.777888-event8/snapshot.jpg'
  },
  // Eventos para Cochera
  {
    id: '1759260100.888999-event9',
    camera: 'Cochera',
    start_time: 1759260100.888999,
    end_time: 1759260120.999000,
    label: 'person',
    sub_label: null,
    top_score: 0.83,
    false_positive: false,
    zones: ['garage'],
    thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    has_clip: true,
    has_snapshot: true,
    score: 0.83,
    area: 16000,
    ratio: 1.2,
    region: [70, 120, 270, 320],
    box: [120, 170, 200, 140],
    current_zones: ['garage'],
    entered_zones: ['garage'],
    thumbnail_url: '/api/events/1759260100.888999-event9/snapshot.jpg'
  },
  {
    id: '1759260420.999000-event10',
    camera: 'Cochera',
    start_time: 1759260420.999000,
    end_time: 1759260440.000111,
    label: 'car',
    sub_label: null,
    top_score: 0.94,
    false_positive: false,
    zones: ['garage'],
    thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    has_clip: true,
    has_snapshot: true,
    score: 0.94,
    area: 30000,
    ratio: 2.0,
    region: [80, 130, 280, 330],
    box: [130, 180, 210, 150],
    current_zones: ['garage'],
    entered_zones: ['garage'],
    thumbnail_url: '/api/events/1759260420.999000-event10/snapshot.jpg'
  }
];

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

// Endpoint para miniaturas de eventos
app.get('/proxy/:hostName/api/events/:eventId/snapshot.jpg', (req, res) => {
  const { eventId } = req.params;
  console.log(`GET /proxy/:hostName/api/events/${eventId}/snapshot.jpg`);
  
  // Encontrar el evento
  const event = mockEvents.find(e => e.id === eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  // Crear una imagen de prueba simple (1x1 pixel transparente)
  const transparentPixel = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0b, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);
  
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Length', transparentPixel.length);
  res.send(transparentPixel);
});

// Endpoint para clips de eventos
app.get('/proxy/:hostName/api/events/:eventId/clip.mp4', (req, res) => {
  const { eventId } = req.params;
  console.log(`GET /proxy/:hostName/api/events/${eventId}/clip.mp4`);
  
  // Para propósitos de demostración, devolver un error 404
  // En un entorno real, esto devolvería el clip de video
  res.status(404).json({ error: 'Video clip not available in demo mode' });
});

// Endpoint específico para eventos
app.get('/proxy/:hostName/api/events', (req, res) => {
  console.log('GET /proxy/:hostName/api/events - Query params:', req.query);
  
  const { cameras, after, before, has_clip, limit = 5000 } = req.query;
  
  // Filtrar eventos por cámara si se especifica
  let filteredEvents = mockEvents;
  if (cameras) {
    const cameraNames = cameras.split(',');
    filteredEvents = mockEvents.filter(event => 
      cameraNames.includes(event.camera)
    );
  }
  
  // Filtrar por tiempo si se especifica
  if (after || before) {
    filteredEvents = filteredEvents.filter(event => {
      const eventTime = event.start_time;
      if (after && eventTime < parseFloat(after)) return false;
      if (before && eventTime > parseFloat(before)) return false;
      return true;
    });
  }
  
  // Filtrar por has_clip si se especifica
  if (has_clip === '1') {
    filteredEvents = filteredEvents.filter(event => event.has_clip);
  }
  
  // Limitar resultados
  const limitNum = parseInt(limit);
  if (limitNum && filteredEvents.length > limitNum) {
    filteredEvents = filteredEvents.slice(0, limitNum);
  }
  
  console.log(`Returning ${filteredEvents.length} events for cameras: ${cameras}`);
  console.log('Filtered events:', filteredEvents.map(e => ({ id: e.id, camera: e.camera, start_time: e.start_time })));
  res.json(filteredEvents);
});

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

// Endpoint para transcodificar video H265 a H264
app.post('/api/transcode', authMiddleware, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  // Use proxied URL for ffmpeg
  const frigateUrl = `http://localhost:4000/proxy/${url.replace(/^https?:\/\//, '')}`;

  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const outputFile = path.join(tempDir, `transcoded_${Date.now()}.mp4`);

  try {
    await new Promise((resolve, reject) => {
      const ffmpegProcess = spawn('ffmpeg', [
        '-i', frigateUrl,
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'fast',
        '-crf', '23',
        '-y', // overwrite
        outputFile
      ]);

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      ffmpegProcess.on('error', reject);

      // Optional: log output
      ffmpegProcess.stdout.on('data', (data) => console.log('FFmpeg stdout:', data.toString()));
      ffmpegProcess.stderr.on('data', (data) => console.log('FFmpeg stderr:', data.toString()));
    });

    const transcodedUrl = `/transcoded/${path.basename(outputFile)}`;
    res.json({ url: transcodedUrl });
  } catch (error) {
    console.error('Transcoding error:', error);
    res.status(500).json({ error: 'Transcoding failed' });
  }
});

// Servir archivos transcodificados
app.get('/transcoded/:filename', authMiddleware, (req, res) => {
  const filePath = path.join(__dirname, 'temp', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
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

// Endpoint para detectar el códec del video
app.post('/api/probe', authMiddleware, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  // Use proxied URL for ffprobe
  const frigateUrl = `http://localhost:4000/proxy/${url.replace(/^https?:\/\//, '')}`;

  try {
    console.log('Starting probe for:', frigateUrl);
    const { spawn } = await import('child_process');
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      frigateUrl
    ]);

    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => stdout += data.toString());
    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('FFprobe stderr:', data.toString());
    });

    ffprobe.on('close', (code) => {
      console.log('FFprobe exit code:', code);
      if (code === 0) {
        const info = JSON.parse(stdout);
        const videoStream = info.streams.find(s => s.codec_type === 'video');
        const codec = videoStream ? videoStream.codec_name : 'unknown';
        console.log('Detected codec:', codec);
        res.json({ codec });
      } else {
        console.log('Probe failed, stderr:', stderr);
        res.status(500).json({ error: 'Probe failed', stderr });
      }
    });

    ffprobe.on('error', (err) => {
      console.log('FFprobe spawn error:', err);
      res.status(500).json({ error: err.message });
    });
  } catch (error) {
    console.log('Probe exception:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para generar video de prueba
app.get('/api/test-video', (req, res) => {
  const { spawn } = require('child_process');
  const ffmpeg = spawn('ffmpeg', [
    '-f', 'lavfi', '-i', 'testsrc=duration=1:size=320x240:rate=1',
    '-f', 'null', '-'
  ]);

  ffmpeg.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  ffmpeg.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });

  ffmpeg.on('close', (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
    res.json({ message: 'Test video generated' });
  });

  ffmpeg.on('error', (err) => {
    console.error('Error starting FFmpeg process:', err);
    res.status(500).json({ error: 'Error generating test video' });
  });
});
