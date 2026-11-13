# FleetGuard

Geofencing and real-time fleet alert platform.

Operators define polygonal geofences, register vehicles, simulate GPS updates on a map, and receive live entry/exit alerts over WebSocket. Location processing commits violations and a transactional outbox row; a publisher pushes events through RabbitMQ to the alert worker and WebSocket hub.

## Quick start

See [SETUP.md](./SETUP.md) for full instructions.

```bash
docker-compose up -d db rabbitmq
cd backend && cp .env.example .env && go run ./cmd/api
cd frontend && cp .env.example .env && npm install && npm run dev
```

- API: `http://localhost:3847`
- UI: `http://localhost:3848`
- WS: `ws://localhost:3847/ws/alerts`

## Repository layout

- `backend/` — Go API (`cmd/api`, `internal/{routes,handler,service,repository,model}`, `pkg`, migrations)
- `frontend/` — React + Vite dashboard (pages/components/store/services, Redux Toolkit)
- `docker-compose.yml` — PostGIS, RabbitMQ, API

## Demo flow

1. Draw a `restricted_zone` geofence on the map.
2. Register a vehicle and configure an alert (`both`).
3. Click outside, send location; click inside, send location.
4. Confirm live toast/feed + violation history.

## Video

**Video link:** _TODO — add link after recording (30–45 min)_

## Notes for reviewers

- Auth intentionally omitted for curl-friendly evaluation; JWT is a roadmap item.
- Every REST response includes `time_ns`.
- Endpoint paths match the assessment brief exactly.
