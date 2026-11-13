import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { wsUrl } from "../services/api";
import { pushLiveAlert, setConnection } from "../store/alertSlice";
import { fetchVehicleLocation } from "../store/vehicleSlice";
import { fetchViolations } from "../store/violationSlice";

export function useAlertSocket() {
  const dispatch = useDispatch();

  useEffect(() => {
    let socket = null;
    let closed = false;
    let retryMs = 1000;
    let timer = null;

    const connect = () => {
      if (closed) return;
      dispatch(setConnection("connecting"));
      socket = new WebSocket(wsUrl());

      socket.onopen = () => {
        retryMs = 1000;
        dispatch(setConnection("connected"));
      };

      socket.onmessage = (event) => {
        try {
          const alert = JSON.parse(event.data);
          dispatch(pushLiveAlert(alert));
          dispatch(fetchViolations({ limit: 50 }));
          if (alert.vehicle?.vehicle_id) {
            dispatch(fetchVehicleLocation(alert.vehicle.vehicle_id));
          }
          const title =
            alert.event_type === "entry"
              ? `${alert.vehicle.vehicle_number} entered ${alert.geofence.geofence_name}`
              : `${alert.vehicle.vehicle_number} exited ${alert.geofence.geofence_name}`;
          toast[alert.event_type === "entry" ? "error" : "success"](title, {
            description: `${alert.geofence.category.replaceAll("_", " ")} · ${new Date(
              alert.timestamp
            ).toLocaleString("en-IN", { timeZone: "Asia/Calcutta" })} IST`,
          });
        } catch {
          // ignore malformed payloads
        }
      };

      socket.onclose = () => {
        dispatch(setConnection("disconnected"));
        if (closed) return;
        timer = setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 15000);
      };

      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      socket?.close();
    };
  }, [dispatch]);
}
