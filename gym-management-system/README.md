# GYMCORE — Beta funcional

Sistema Integral de Gestión de Gimnasio, Rutinas y Clases (Grupo 5).

## Ejecutar

### 1. Base de datos (Docker)
```bash
cd backend
docker compose up -d
```

### 2. Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```
Corre en `http://localhost:4000`.

### 3. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Corre en `http://localhost:5173`.

## Credenciales de prueba
- Administrador: `admin@gym.com` / `Admin123*`
- Entrenador: `trainer@gym.com` / `Trainer123*`
