# Backend multi-frigate

## Endpoints

- `POST /api/login` — Login con usuario y contraseña. Devuelve JWT.
- `GET /api/me` — Devuelve info del usuario autenticado (requiere JWT).

## Usuario por defecto
- Usuario: `admin`
- Contraseña: `admin123`
- Rol: `admin`

## Base de datos
- SQLite, archivo en `../DB/users.db`

## Variables de entorno
- `JWT_SECRET` — Secreto para firmar JWT (por defecto: `supersecret`)
- `PORT` — Puerto del backend (por defecto: 4000)

## Docker
- Usa el Dockerfile y docker-compose del proyecto raíz.
