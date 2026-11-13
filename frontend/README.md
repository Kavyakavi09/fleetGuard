# FleetGuard Web

Simple React + Vite frontend (VYBE-style layout).

```
src/
  components/   # UI pieces
  hooks/        # useAlertSocket
  pages/        # Route screens
  services/     # Axios API client
  store/        # store.js + vehicle/geofence/alert/map/ui/violation slices
  utils/
  App.jsx
  main.jsx
```

```bash
cp .env.example .env
npm install
npm run dev
```

App runs on `http://localhost:3848`.
