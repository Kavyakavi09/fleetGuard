import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { alertApi } from "../services/api";
import { fetchAlertRules } from "../store/alertSlice";
import {
  Badge,
  Button,
  EmptyState,
  FieldLabel,
  LoadingText,
  Panel,
  PanelHeader,
  Select,
  eventTone,
} from "./ui";

export default function AlertPanel() {
  const dispatch = useDispatch();
  const geofences = useSelector((s) => s.geofence.list);
  const vehicles = useSelector((s) => s.vehicle.list);
  const alertRules = useSelector((s) => s.alert.rules);
  const loading = useSelector((s) => s.alert.loading);
  const [geofenceId, setGeofenceId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [eventType, setEventType] = useState("both");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!geofenceId) {
      toast.error("Select a geofence");
      return;
    }
    setSaving(true);
    try {
      await alertApi.configure({
        geofence_id: geofenceId,
        vehicle_id: vehicleId || undefined,
        event_type: eventType,
      });
      toast.success("Alert rule configured");
      setGeofenceId("");
      setVehicleId("");
      setEventType("both");
      dispatch(fetchAlertRules());
    } catch (e) {
      toast.error(e.message || "Configure failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel>
      <PanelHeader title="Alert Rules" subtitle="Trigger on geofence entry or exit" />

      <div className="space-y-3">
        <div>
          <FieldLabel>Geofence</FieldLabel>
          <Select value={geofenceId} onChange={(e) => setGeofenceId(e.target.value)}>
            <option value="">Select geofence</option>
            {geofences.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel>Vehicle (optional)</FieldLabel>
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
          <FieldLabel>Event type</FieldLabel>
          <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
            <option value="entry">Entry</option>
            <option value="exit">Exit</option>
            <option value="both">Both</option>
          </Select>
        </div>
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Saving…" : "Configure alert"}
        </Button>
      </div>

      <div className="mt-5 max-h-72 space-y-2 overflow-y-auto">
        {loading && <LoadingText />}
        {!loading && alertRules.length === 0 && (
          <EmptyState
            title="No alert rules"
            description="Configure a rule to receive realtime notifications."
          />
        )}
        {!loading &&
          alertRules.map((r) => (
            <div
              key={r.alert_id}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/60 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{r.geofence_name}</p>
                <Badge tone={r.event_type === "both" ? "info" : eventTone(r.event_type)}>
                  {r.event_type}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {r.vehicle_number || "All vehicles"}
              </p>
            </div>
          ))}
      </div>
    </Panel>
  );
}
