# 🛠️ Step 1.1 (Revised): Codebase Scaffolding — After Audit & Cleanup

> **Goal**: Fix all issues identified in the Task 1.1 audit, bringing the scaffolding fully up to spec before proceeding to Task 1.2 (Database Schemas).
>
> **Original scaffolding entry**: See `01-DAY1-SCAFFOLDING.md`

---

## What Was Wrong & What Was Fixed

### 🔴 Frontend Fixes

#### Fix 1: Boilerplate Cleanup
* **Problem**: `App.jsx` contained the default Vite "Get Started" template (counter button, React/Vite logos, Discord social links). `App.css` had 185 lines of irrelevant template styles (`.hero`, `.counter`, `.ticks`).
* **Fix**: Replaced both files entirely.
  * `App.jsx` → Now contains a clean AeroMesh route shell with three placeholder pages.
  * `App.css` → Now contains only AeroMesh-specific styles (Leaflet map container overrides).

#### Fix 2: React Router Installed
* **Problem**: No routing was set up. A multi-view app (Dashboard / Citizen Portal / Map / Alerts) needs a routing library.
* **Package installed**: `react-router-dom`
* **What it does**: Allows the user to navigate between `/` (Command Center), `/report` (Citizen Portal), `/map`, `/alerts`, etc. without a full page reload.
* **How it's used in code**: `<BrowserRouter>` wraps the entire app in `App.jsx`. `<Routes>` + `<Route>` define which component renders at which URL path.

#### Fix 3: Leaflet Map Library Installed
* **Problem**: The architecture specifies an interactive geospatial corridor map — the single most important visual component — but no map library was installed.
* **Packages installed**: `leaflet` + `react-leaflet`
* **What it does**: `leaflet` is the mapping engine (renders tiles, markers, polygons). `react-leaflet` is a React wrapper that lets us use Leaflet as React components (`<MapContainer>`, `<TileLayer>`, `<Marker>`, `<Polygon>`).
* **Where it will be used**: The `<MapView />` component on the Command Center Dashboard (Day 5).

#### Fix 4: Recharts Installed
* **Package installed**: `recharts`
* **What it does**: A composable React charting library for rendering AQI trend line charts, PM2.5 bar charts, and confidence score graphs.
* **Where it will be used**: Sidebar KPI trend charts and the historical pollution analysis panel.

#### Fix 5: Inter Font Properly Loaded
* **Problem**: `index.css` referenced `font-family: 'Inter'` but Inter was never actually downloaded — the browser would silently fall back to system fonts, giving an inconsistent look on different OSes.
* **Fix**: Added Google Fonts `<link>` tags inside `index.html` `<head>` using the `rel="preconnect"` + `href` pattern for optimal loading performance.

#### Fix 6: index.html Title & Meta Description
* **Problem**: `<title>` was literally "frontend". No meta description.
* **Fix**:
  * Title → `AeroMesh | Air Pollution Early Warning System`
  * Meta description → Explains the platform for hackathon judges and browser tabs.

---

### 🔴 Backend Fixes

#### Fix 7: `__init__.py` Files Added
* **Problem**: Python requires an `__init__.py` file in every folder for it to be treated as an importable package. Without it, `from app.models.sensor import Sensor` would fail with an `ImportError`.
* **Files created**: `backend/app/__init__.py`, `backend/app/api/__init__.py`, `backend/app/core/__init__.py`, `backend/app/models/__init__.py`, `backend/app/schemas/__init__.py`, `backend/app/services/__init__.py`
* **These files are intentionally blank** — they simply tell Python "this directory is a package."

#### Fix 8: `.env.example` Created
* **Problem**: `pydantic-settings` and `python-dotenv` were installed but there was no template for what environment variables the backend needs. Teammates can't configure the project without knowing what goes in `.env`.
* **Fix**: Created `backend/.env.example` with all required variables documented:
  * `DATABASE_URL` (PostGIS connection string for Docker)
  * `NASA_FIRMS_API_KEY`
  * `OPENAQ_API_KEY`
  * `OPEN_METEO_BASE_URL`
  * `TWILIO_*` (for SMS alerts)
  * `APP_ENV`, `DEBUG`, `CORS_ORIGINS`

---

### 🟡 Architecture Document Fixes

#### Fix 9: Removed "Glassmorphism" from Tech Stack Table
* **Problem**: `FINAL_ARCHITECTURE.md` still said "Custom glassmorphism design system" — contradicting the explicit design direction of a clean, light Fleet Management aesthetic.
* **Fix**: Updated to "Clean Fleet Operations Design System — light theme"

#### Fix 10: Full UI/UX Design System Section Written
* **Problem**: The UI/UX specification was 4 bullet points, not enough for any developer to build from.
* **Fix**: Expanded to a full design system specification including:
  * **Color Palette** (10 tokens with hex codes, Tailwind classes, and usage)
  * **Typography Scale** (6 type roles with sizes, weights, Tailwind classes)
  * **Layout Blueprint** (ASCII diagram of sidebar + topbar + map + panel layout)
  * **Page/View Inventory** (5 routes with user role mapping)
  * **Component Inventory** (9 named components with descriptions)
  * **Spacing System** (base unit, card padding, gap, border radius)

---

## Final Package List After Audit Cleanup

### Frontend (`/frontend/package.json`)
| Package | Purpose |
| :--- | :--- |
| `react` + `react-dom` | Core React framework |
| `react-router-dom` | Client-side page routing |
| `react-leaflet` + `leaflet` | Interactive geospatial map |
| `recharts` | AQI trend charts & KPI visualizations |
| `lucide-react` | Clean vector icon set |
| `clsx` + `tailwind-merge` | Utility for composing Tailwind class strings safely |
| `tailwindcss` + `@tailwindcss/vite` | CSS styling engine (dev) |
| `@vitejs/plugin-react` | React fast-refresh in Vite (dev) |

### Backend (`/backend/requirements.txt`)
| Package | Purpose |
| :--- | :--- |
| `fastapi` | Python async web API framework |
| `uvicorn[standard]` | ASGI server to run FastAPI |
| `sqlalchemy` | Python ORM for database queries |
| `geoalchemy2` | Spatial extension for SQLAlchemy (PostGIS) |
| `psycopg2-binary` | PostgreSQL database driver |
| `pydantic` + `pydantic-settings` | Data validation & env var management |
| `httpx` | Async HTTP client (for calling OpenAQ, NASA FIRMS, Open-Meteo) |
| `python-dotenv` | Load `.env` file into environment variables |
