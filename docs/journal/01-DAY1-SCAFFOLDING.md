# 🛠️ Step 1.1: Codebase Scaffolding & Initial Architecture Setup

> **Goal**: Establish a scalable full-stack project skeleton with a React frontend, Python FastAPI backend, and PostgreSQL + PostGIS database container.

---

## 1. 🎨 Frontend Setup (`/frontend`)

### What We Did:
* **Tool Used**: `Vite` with React template.
* **Command Executed**: `npx create-vite frontend --template react`
* **Styling Engine**: `Tailwind CSS 4` via `@tailwindcss/vite`.
* **Icons & Utility Helpers**: `lucide-react`, `clsx`, `tailwind-merge`.

### Why We Did It This Way:
1. **Why Vite instead of Create-React-App?**: Vite uses native ES Modules during development, providing instant server start (<300ms) and lightning-fast Hot Module Replacement (HMR).
2. **Why Tailwind CSS 4?**: Tailwind 4 simplifies configuration by replacing `tailwind.config.js` with a single `@import "tailwindcss";` directive in `src/index.css`.
3. **Why Lucide Icons?**: Offers clean, consistent vector icons (`Wind`, `AlertTriangle`, `Activity`, `MapPin`) that align with our modern Fleet Management dashboard design style.

---

## 2. ⚡ Backend Setup (`/backend`)

### Directory Structure Created:
```text
backend/
├── app/
│   ├── api/        <-- API endpoints & route handlers
│   ├── core/       <-- Configuration & security settings
│   ├── models/     <-- Database schemas (SQLAlchemy & PostGIS)
│   ├── schemas/    <-- Request/Response validation models (Pydantic)
│   └── services/   <-- Business logic & external API clients (OpenAQ, Open-Meteo)
├── main.py         <-- FastAPI entry point & CORS configuration
└── requirements.txt<-- Python dependency manifest
```

### Why We Did It This Way:
* **Modular Clean Architecture**: Separating models, schemas, and routes ensures code remains maintainable as the project grows over the 7-day hackathon sprint.
* **CORS Middleware**: Enabled Cross-Origin Resource Sharing on FastAPI (`main.py`) so the React frontend (running on `http://localhost:5173`) can communicate seamlessly with the backend API (`http://localhost:8000`).

---

## 3. 🗄️ Database Setup (`docker-compose.yml`)

### Container Definition:
```yaml
services:
  aeromesh-db:
    image: postgis/postgis:16-3.4
    ports:
      - "5432:5432"
```

### Why We Did It This Way:
* **Docker Containerization**: Prevents having to manually install PostgreSQL on your computer. Running `docker compose up -d` starts a dedicated database instance in seconds.
* **PostGIS Extension**: Extends PostgreSQL to store geographic objects (points, lines, polygons). This is essential for spatial functions like `ST_Contains` (checking if a city falls inside a smoke plume polygon) and `ST_DWithin` (finding sensors within 10 km of a fire spot).

---

## 🔍 How to Verify This Step

1. **Test Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   *Open `http://localhost:5173` in your browser.*

2. **Test Backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
   *Open `http://localhost:8000/docs` to see the auto-generated Swagger API documentation.*

3. **Start PostGIS Database**:
   ```bash
   docker compose up -d
   ```
