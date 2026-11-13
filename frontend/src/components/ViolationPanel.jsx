import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchViolations } from "../store/violationSlice";
import {
  Badge,
  Button,
  EmptyState,
  FieldLabel,
  Input,
  LoadingText,
  Panel,
  PanelHeader,
  Select,
  eventTone,
} from "./ui";

function toRFC3339(localValue) {
  if (!localValue) return undefined;
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export default function ViolationPanel() {
  const dispatch = useDispatch();
  const vehicles = useSelector((s) => s.vehicle.list);
  const geofences = useSelector((s) => s.geofence.list);
  const violations = useSelector((s) => s.violation.list);
  const violationTotal = useSelector((s) => s.violation.total);
  const loading = useSelector((s) => s.violation.loading);

  const [vehicleId, setVehicleId] = useState("");
  const [geofenceId, setGeofenceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((violationTotal || 0) / limit)),
    [violationTotal, limit]
  );

  const load = (nextPage = page, nextLimit = limit) => {
    dispatch(
      fetchViolations({
        vehicle_id: vehicleId || undefined,
        geofence_id: geofenceId || undefined,
        start_date: toRFC3339(startDate),
        end_date: toRFC3339(endDate),
        limit: nextLimit,
        offset: (nextPage - 1) * nextLimit,
      })
    );
  };

  useEffect(() => {
    load(1, limit);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = () => {
    setPage(1);
    load(1, limit);
  };

  const goPage = (next) => {
    const safe = Math.min(Math.max(1, next), totalPages);
    setPage(safe);
    load(safe, limit);
  };

  return (
    <Panel>
      <PanelHeader
        title="Violation History"
        subtitle="Filterable geofence event log"
        action={<Badge tone="info">{violationTotal} total</Badge>}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <FieldLabel>Vehicle</FieldLabel>
          <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">All vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicle_number}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel>Geofence</FieldLabel>
          <Select value={geofenceId} onChange={(e) => setGeofenceId(e.target.value)}>
            <option value="">All geofences</option>
            {geofences.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel>Start</FieldLabel>
          <Input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>End</FieldLabel>
          <Input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex items-end md:col-span-2 xl:col-span-1">
          <Button onClick={apply} disabled={loading} className="w-full">
            {loading ? "Loading…" : "Apply filters"}
          </Button>
        </div>
      </div>

      <div className="mt-5 max-h-[420px] overflow-x-auto">
        {loading && <LoadingText />}
        {!loading && violations.length === 0 && (
          <EmptyState
            title="No violations recorded"
            description="Entry and exit events will appear here after location updates."
          />
        )}
        {!loading && violations.length > 0 && (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="pb-3 font-medium">Time</th>
                <th className="pb-3 font-medium">Event</th>
                <th className="pb-3 font-medium">Vehicle</th>
                <th className="pb-3 font-medium">Geofence</th>
                <th className="pb-3 font-medium">Location</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v) => (
                <tr key={v.id} className="border-t border-[var(--border)]">
                  <td className="py-3 pr-3 text-[var(--muted)]">
                    {new Date(v.timestamp).toLocaleString("en-IN", {
                      timeZone: "Asia/Calcutta",
                    })}
                  </td>
                  <td className="py-3 pr-3">
                    <Badge tone={eventTone(v.event_type)}>{v.event_type}</Badge>
                  </td>
                  <td className="py-3 pr-3 font-medium">{v.vehicle_number}</td>
                  <td className="py-3 pr-3">{v.geofence_name}</td>
                  <td className="py-3 text-[var(--muted)]">
                    {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-[var(--muted)]">
            Page {page} of {totalPages}
          </p>
          <Select
            value={String(limit)}
            className="h-9 w-[120px]"
            onChange={(e) => {
              const nextLimit = Number(e.target.value);
              setLimit(nextLimit);
              setPage(1);
              load(1, nextLimit);
            }}
          >
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
            <option value="200">200 / page</option>
            <option value="500">500 / page</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={loading || page <= 1}
            onClick={() => goPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={loading || page >= totalPages}
            onClick={() => goPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </Panel>
  );
}
