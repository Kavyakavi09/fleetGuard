# FleetGuard — SETUP

Geofencing and real-time vehicle alert system for fleet operations.

Operators define polygonal geofences, register vehicles, push GPS location updates, and receive live entry/exit alerts over WebSocket. Violation history is queryable with filters and pagination.

---

## Prerequisites and dependencies

### Required tools

| Tool | Version | Purpose |
|------|---------|---------|
| Go | 1.22+ (toolchain may fetch newer) | Backend API |
| Node.js | 20+ | Frontend (Vite/React) |
| npm | comes with Node | Frontend packages |
| Docker + Docker Compose | recent | Postgres/PostGIS, RabbitMQ, optional API container |
| curl / browser | — | API and UI testing |

### Runtime dependencies

**Backend**
- PostgreSQL **16** with **PostGIS** (geospatial `ST_Covers` point-in-polygon)
- RabbitMQ **3.13** (alert event bus)
- Gorilla WebSocket (live alert delivery)

**Frontend**
- React 19 + Vite
- React Router, Redux Toolkit, Axios
- React Leaflet (map), Tailwind CSS, Sonner (toasts)

---

## Local setup

### 1. Clone and start infrastructure

From the repo root:

```bash
docker compose up -d db rabbitmq
```

| Service | Local URL / port |
|---------|------------------|
| Postgres / PostGIS | `localhost:5433` |
| RabbitMQ AMQP | `localhost:5673` |
| RabbitMQ Management UI | http://localhost:15673 (`guest` / `guest`) |

### 2. Backend

```bash
cd backend
cp .env.example .env
go run ./cmd/api
```

Default `.env.example` values (local):

```env
HTTP_PORT=3847
DATABASE_URL=postgres://fleetguard:fleetguard@localhost:5433/fleetguard?sslmode=disable
RABBITMQ_URL=amqp://guest:guest@localhost:5673/
CORS_ORIGINS=http://localhost:3000,http://localhost:3848
MIGRATIONS_DIR=migrations
```

- API: http://localhost:3847  
- Migrations run automatically on startup  
- Health: `GET /health`

```bash
curl http://localhost:3847/health
```

Expected: `{"status":"ok", ...}`

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

`.env.example`:

```env
VITE_API_URL=http://localhost:3847
VITE_WS_URL=ws://localhost:3847/ws/alerts
```

Open http://localhost:3848 — sidebar should show **Realtime connected**.

---

## Run with Docker Compose

Builds and runs **db + rabbitmq + api** together:

```bash
# from repo root
docker compose up --build
```

| Service | Port |
|---------|------|
| API | http://localhost:3847 |
| Postgres | localhost:5433 |
| RabbitMQ AMQP | localhost:5673 |
| RabbitMQ UI | http://localhost:15673 |

Compose uses **local** services only (no cloud secrets):

- `DATABASE_URL=postgres://fleetguard:fleetguard@db:5432/fleetguard?sslmode=disable`
- `RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/`
- `CORS_ORIGINS=*`

Frontend is **not** in Compose — run it with npm (or deploy to Netlify):

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Stop:

```bash
docker compose down
```

Remove DB volume (reset data):

```bash
docker compose down -v
```

### Backend image (Docker Hub)

```bash
cd backend
docker build -t <your-dockerhub-user>/fleetguard-api:latest .
docker push <your-dockerhub-user>/fleetguard-api:latest
```

---

## API testing guide (curl)

Base URL: `http://localhost:3847`  
Coordinates are **`[latitude, longitude]`**.  
Every JSON response includes `time_ns`.

### Health

```bash
curl -s http://localhost:3847/health
```

### Create geofence

```bash
curl -s -X POST http://localhost:3847/geofences \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Restricted Warehouse",
    "description": "Unauthorized entry prohibited",
    "category": "restricted_zone",
    "coordinates": [
      [13.0827, 80.2707],
      [13.0927, 80.2707],
      [13.0927, 80.2807],
      [13.0827, 80.2807],
      [13.0827, 80.2707]
    ]
  }'
```

Categories: `delivery_zone` | `restricted_zone` | `toll_zone` | `customer_area`

### List geofences (optional filter)

```bash
curl -s "http://localhost:3847/geofences"
curl -s "http://localhost:3847/geofences?category=restricted_zone"
```

### Register vehicle

```bash
curl -s -X POST http://localhost:3847/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_number": "TN-01-AB-1234",
    "driver_name": "Arun Kumar",
    "vehicle_type": "truck",
    "phone": "+919876543210"
  }'
```

### List vehicles

```bash
curl -s http://localhost:3847/vehicles
```

### Configure alert rule

Replace IDs from previous responses. Omit `vehicle_id` to apply to all vehicles.

```bash
curl -s -X POST http://localhost:3847/alerts/configure \
  -H "Content-Type: application/json" \
  -d '{
    "geofence_id": "geo_xxx",
    "vehicle_id": "veh_xxx",
    "event_type": "both"
  }'
```

`event_type`: `entry` | `exit` | `both`

### List alert rules

```bash
curl -s http://localhost:3847/alerts
```

### Update location (triggers geofence detection)

Use **newer** RFC3339 timestamps than the previous update for the same vehicle.

```bash
# Outside zone
curl -s -X POST http://localhost:3847/vehicles/location \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "veh_xxx",
    "latitude": 13.0800,
    "longitude": 80.2600,
    "timestamp": "2026-11-13T10:00:00Z"
  }'

# Inside zone → entry event (if alert rule matches)
curl -s -X POST http://localhost:3847/vehicles/location \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_id": "veh_xxx",
    "latitude": 13.0877,
    "longitude": 80.2757,
    "timestamp": "2026-11-13T10:05:00Z"
  }'
```

### Current vehicle location

```bash
curl -s "http://localhost:3847/vehicles/location/veh_xxx"
```

### Violation history (filters + pagination)

```bash
curl -s "http://localhost:3847/violations/history?limit=50&offset=0"

curl -s "http://localhost:3847/violations/history?vehicle_id=veh_xxx&geofence_id=geo_xxx&limit=50&offset=0"
```

Optional: `start_date`, `end_date` (RFC3339).

### Real-time alerts (WebSocket)

```text
ws://localhost:3847/ws/alerts
```

Browser UI connects automatically. For a quick CLI check (if `websocat` is installed):

```bash
websocat ws://localhost:3847/ws/alerts
```

Then send an inside/outside location update in another terminal and watch the JSON alert payload.

### Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/geofences` | Create geofence |
| GET | `/geofences` | List / filter geofences |
| POST | `/vehicles` | Register vehicle |
| GET | `/vehicles` | List vehicles |
| POST | `/vehicles/location` | Update GPS + detect entry/exit |
| GET | `/vehicles/location/{vehicle_id}` | Current location + geofences |
| POST | `/alerts/configure` | Create alert rule |
| GET | `/alerts` | List alert rules |
| GET | `/violations/history` | Paginated violation history |
| GET | `/ws/alerts` | WebSocket live alerts |

---

## Frontend usage guide

Open http://localhost:3848 with the API running.

### Dashboard
- KPI cards: vehicles, geofences, live alerts, today’s events  
- Live map with geofence polygons and vehicle markers  
- Live alert feed + quick actions  

### Geofences
1. Open **Geofences**  
2. Click **Draw on map**, click 3+ vertices  
3. Enter name / description / category → **Save geofence**  
4. Filter the list by category  

### Vehicles
Tabs: **Fleet** | **Locate** | **Add**

1. **Add** — register vehicle number, driver, type, phone  
2. **Fleet** — select a vehicle (list is primary)  
3. **Locate** — pick location:
   - **Pick on map** (clicks work inside polygons), or  
   - **Place inside a zone** dropdown, or  
   - enter lat/lng manually  
4. **Send location** — toast shows inside/outside status  

### Alerts
1. Configure rule: geofence + optional vehicle + entry/exit/both  
2. Trigger location outside → inside (or reverse)  
3. Confirm:
   - Sonner toast  
   - Live Alerts feed  
   - Bell badge count  
   - Sidebar **Realtime connected**  

### Violations
- Table of historical entry/exit events  
- Filter by vehicle, geofence, date range  
- Page size + Previous/Next at the bottom  

### Map controls
- **+ / −** zoom  
- **↺** fit main geofence/vehicle cluster (ignores far outliers)  

---

## Architecture overview

```text
┌────────────┐     REST/WS      ┌─────────────────┐
│  React UI  │ ◄──────────────► │   Go API (:3847) │
│  Redux +   │   /ws/alerts     │  handlers/services│
│  Leaflet   │                  └────────┬────────┘
└────────────┘                           │
                                         ▼
                              ┌────────────────────┐
                              │ PostgreSQL+PostGIS │
                              │ locations, states, │
                              │ violations, outbox │
                              └─────────┬──────────┘
                                        │ publish
                                        ▼
                              ┌────────────────────┐
                              │     RabbitMQ       │
                              └─────────┬──────────┘
                                        │ consume
                                        ▼
                              ┌────────────────────┐
                              │ Alert worker → Hub │
                              │ WebSocket clients  │
                              └────────────────────┘
```

### Location update flow
1. `POST /vehicles/location` validates vehicle + timestamp (must not be older than last point).  
2. Point stored; PostGIS `ST_Covers` finds containing geofences.  
3. Compare with previous inside-state → **entry** / **exit**.  
4. Matching alert rules → violation row + **notification_outbox** row in the **same DB transaction**.  
5. Outbox publisher pushes to RabbitMQ.  
6. Worker consumes and broadcasts on the WebSocket hub.  
7. Frontend toast + live feed update without refresh.

### Backend layout
```text
backend/
  cmd/api/           # entrypoint
  internal/
    handler/         # HTTP
    service/         # business logic, outbox
    repository/      # SQL / PostGIS
    model/           # DTOs
    routes/          # mux wiring
    middleware/      # CORS, timing, recover
  migrations/        # schema
  pkg/               # websocket, messaging, response
```

### Frontend layout
```text
frontend/src/
  pages/             # Dashboard, Map, Geofences, Vehicles, Alerts, Violations
  components/        # FleetMap, panels, TopBar, Sidebar
  store/             # Redux slices
  services/api.js    # Axios client
  hooks/             # useAlertSocket
```

### Coordinate note
API uses `[latitude, longitude]`. PostGIS/GeoJSON use `(longitude, latitude)`. Conversion is handled in the backend.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API won’t start | Ensure `db` + `rabbitmq` are healthy: `docker compose ps` |
| Frontend offline WS | Check API is up; `VITE_WS_URL=ws://localhost:3847/ws/alerts` |
| No live alerts | Alert rule must match geofence (+ vehicle); move outside then inside; timestamps must increase |
| Can’t click inside polygon | Use **Pick on map** mode (polygons don’t block clicks); or **Place inside a zone** |
| Migration / DB errors | Reset volume: `docker compose down -v` then `up` again |

---

## Production deploy (brief)

- **Frontend:** Netlify — set `VITE_API_URL` (https) and `VITE_WS_URL` (wss)  
- **Backend:** Docker image on Render with managed PostGIS + RabbitMQ (or CloudAMQP)  
- Set `CORS_ORIGINS` to your Netlify URL (or `*` for demo)
