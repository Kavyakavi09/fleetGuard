import AlertPanel from "../components/AlertPanel";
import LiveAlerts from "../components/LiveAlerts";

export default function Alerts() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AlertPanel />
      <LiveAlerts featured />
    </div>
  );
}
