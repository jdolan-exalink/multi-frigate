


import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../DB/users.db');
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

// Redirect /login to frontend login
app.get('/login', (req, res) => {
  res.redirect('/');
});

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, '../build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/apiv1')) {
    next();
  } else {
    res.sendFile(path.join(__dirname, '../build/index.html'));
  }
});
// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../build')));

// Las rutas API deben ir antes de la ruta catch-all
app.get('/api/*', (req, res, next) => {
  next();
});

app.get('/apiv1/*', (req, res, next) => {
  next();
});

// Ruta catch-all para el frontend - debe ir después de todas las rutas API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});


// Mock data para endpoints Frigate
const mockConfig = [{ key: 'example', value: 'mock config' }];
const mockHosts = [
  {
    id: '1',
    createAt: new Date().toISOString(),
    updateAt: new Date().toISOString(),
    name: 'Host 1',
    host: 'http://localhost:5000',
    enabled: true,
    state: true
  }
];
const mockCameras = [{ id: 1, name: 'Camera 1', hostId: 1 }];
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

// Middleware de autenticación para mock endpoints
app.use('/apiv1', authMiddleware);

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
app.get('/apiv1/cameras', (req, res) => res.json(mockCameras));
app.get('/apiv1/cameras/:id', (req, res) => res.json(mockCameras[0]));
app.get('/apiv1/roles', (req, res) => {
  console.log('GET /apiv1/roles - Response:', mockRoles);
  res.json(mockRoles);
});
app.get('/apiv1/config/admin', (req, res) => res.json({ key: 'adminRole', value: 'admin' }));

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

// Ejemplo de ruta protegida
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

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
