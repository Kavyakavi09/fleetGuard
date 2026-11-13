import { lazy, Suspense } from "react";
import VehiclePanel from "../components/VehiclePanel";
import { Panel } from "../components/ui";

const FleetMap = lazy(() => import("../components/FleetMap"));

export default function Vehicles() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr] xl:items-start">
      <Panel
        padded={false}
        className="overflow-hidden xl:sticky xl:top-[5.5rem]"
      >
        <Suspense
          fallback={
            <div className="flex h-[420px] items-center justify-center text-sm text-[var(--muted)] xl:h-[calc(100vh-9rem)]">
              Loading map…
            </div>
          }
        >
          <div className="h-[420px] w-full sm:h-[520px] xl:h-[calc(100vh-9rem)]">
            <FleetMap compact />
          </div>
        </Suspense>
      </Panel>
      <VehiclePanel />
    </div>
  );
}
