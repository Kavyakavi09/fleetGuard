import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { geofenceApi } from "../services/api";
import { fetchGeofences } from "../store/geofenceSlice";
import { setDraftPolygon, setMapMode } from "../store/mapSlice";
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
  Textarea,
  categoryLabel,
  categoryTone,
} from "./ui";

export default function GeofencePanel() {
  const dispatch = useDispatch();
  const geofences = useSelector((s) => s.geofence.list);
  const loading = useSelector((s) => s.geofence.loading);
  const draftPolygon = useSelector((s) => s.map.draftPolygon);
  const mapMode = useSelector((s) => s.map.mode);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("restricted_zone");
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Enter a geofence name");
      return;
    }
    if (!draftPolygon || draftPolygon.length < 3) {
      toast.error("Draw at least 3 points on the map");
      return;
    }
    const closed = [...draftPolygon];
    const first = closed[0];
    const last = closed[closed.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      closed.push([first[0], first[1]]);
    }
    setSaving(true);
    try {
      await geofenceApi.create({
        name: name.trim(),
        description: description.trim(),
        category,
        coordinates: closed,
      });
      toast.success("Geofence created");
      setName("");
      setDescription("");
      dispatch(setDraftPolygon(null));
      dispatch(setMapMode("view"));
      dispatch(fetchGeofences(filter || undefined));
    } catch (e) {
      toast.error(e.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Geofences"
        subtitle="Draw polygons and manage zones"
        action={
          <Select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              dispatch(fetchGeofences(e.target.value || undefined));
            }}
            className="max-w-[160px]"
          >
            <option value="">All</option>
            <option value="delivery_zone">Delivery</option>
            <option value="restricted_zone">Restricted</option>
            <option value="toll_zone">Toll</option>
            <option value="customer_area">Customer</option>
          </Select>
        }
      />

      <div className="space-y-3">
        <div>
          <FieldLabel>Name</FieldLabel>
          <Input
            placeholder="e.g. Restricted Warehouse"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <Textarea
            placeholder="Optional notes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Category</FieldLabel>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="delivery_zone">Delivery Zone</option>
            <option value="restricted_zone">Restricted Zone</option>
            <option value="toll_zone">Toll Zone</option>
            <option value="customer_area">Customer Area</option>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={mapMode === "draw-geofence" ? "default" : "secondary"}
            onClick={() => {
              dispatch(setDraftPolygon([]));
              dispatch(setMapMode("draw-geofence"));
            }}
          >
            Draw on map
          </Button>
          <Button type="button" variant="secondary" onClick={() => dispatch(setDraftPolygon([]))}>
            Clear
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save geofence"}
          </Button>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Draft points: <span className="font-semibold text-[var(--fg)]">{draftPolygon?.length || 0}</span>
        </p>
      </div>

      <div className="mt-5 max-h-64 space-y-2 overflow-y-auto">
        {loading && <LoadingText />}
        {!loading && geofences.length === 0 && (
          <EmptyState title="No geofences yet" description="Create a zone to start monitoring." />
        )}
        {!loading &&
          geofences.map((g) => (
            <div
              key={g.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/60 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{g.name}</p>
                <Badge tone={categoryTone(g.category)}>{categoryLabel(g.category)}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                {g.description || "No description"}
              </p>
            </div>
          ))}
      </div>
    </Panel>
  );
}
