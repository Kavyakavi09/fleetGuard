export function collectCoveragePoints(geofences = [], vehicleLocations = {}) {
  const points = [];
  geofences.forEach((g) => {
    g.coordinates?.forEach((c) => {
      if (Number.isFinite(c?.[0]) && Number.isFinite(c?.[1])) {
        points.push({ lat: c[0], lng: c[1] });
      }
    });
  });
  Object.values(vehicleLocations).forEach((loc) => {
    if (Number.isFinite(loc?.latitude) && Number.isFinite(loc?.longitude)) {
      points.push({ lat: loc.latitude, lng: loc.longitude });
    }
  });
  return points;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Keep the densest local cluster and drop far-away outliers
 * (e.g. a San Francisco test geofence mixed with Chennai ops data).
 */
export function filterMainCluster(points, maxSpanDeg = 4) {
  if (!points?.length) return [];
  if (points.length === 1) return points;

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const medLat = median(lats);
  const medLng = median(lngs);

  const nearby = points.filter(
    (p) => Math.abs(p.lat - medLat) <= maxSpanDeg && Math.abs(p.lng - medLng) <= maxSpanDeg
  );

  if (nearby.length > 0) return nearby;

  // Fallback: grid-bucket densest cell (~1 degree)
  const buckets = new Map();
  points.forEach((p) => {
    const key = `${Math.round(p.lat)},${Math.round(p.lng)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
  });
  let best = points;
  buckets.forEach((group) => {
    if (group.length > best.length) best = group;
  });
  return best;
}

export function getCoverageCentroid(geofences, vehicleLocations) {
  const points = filterMainCluster(collectCoveragePoints(geofences, vehicleLocations));
  if (points.length === 0) return null;
  const sum = points.reduce(
    (acc, p) => {
      acc.lat += p.lat;
      acc.lng += p.lng;
      return acc;
    },
    { lat: 0, lng: 0 }
  );
  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length,
  };
}

export function getCoverageFitPoints(geofences, vehicleLocations) {
  return filterMainCluster(collectCoveragePoints(geofences, vehicleLocations)).map((p) => [
    p.lat,
    p.lng,
  ]);
}

export function formatRegionLabel(parts = {}) {
  const city =
    parts.city ||
    parts.locality ||
    parts.town ||
    parts.village ||
    parts.principalSubdivision ||
    parts.state ||
    null;
  return city || null;
}
