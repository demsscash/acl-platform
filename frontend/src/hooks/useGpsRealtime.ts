import { useEffect, useState, useCallback, useRef } from 'react';
import {
  gpsWebSocket,
  type GpsPositionUpdate,
  type GpsAlertNotification,
  type GeofenceEvent,
} from '../services/gps.service';
import { useAuthStore } from '../stores/auth.store';

interface UseGpsRealtimeOptions {
  autoConnect?: boolean;
  subscribeToAlerts?: boolean;
  trackerIds?: number[];
  geofenceIds?: number[];
}

interface GpsRealtimeState {
  isConnected: boolean;
  positions: Map<number, GpsPositionUpdate>;
  alerts: GpsAlertNotification[];
  geofenceEvents: GeofenceEvent[];
  lastUpdate: Date | null;
}

export function useGpsRealtime(options: UseGpsRealtimeOptions = {}) {
  const {
    autoConnect = true,
    subscribeToAlerts = true,
    trackerIds = [],
    geofenceIds = [],
  } = options;

  const { token } = useAuthStore();
  const [state, setState] = useState<GpsRealtimeState>({
    isConnected: false,
    positions: new Map(),
    alerts: [],
    geofenceEvents: [],
    lastUpdate: null,
  });

  const unsubscribersRef = useRef<(() => void)[]>([]);
  const alertsLimitRef = useRef(100); // Keep last 100 alerts

  const connect = useCallback(async () => {
    if (!token) {
      console.warn('[useGpsRealtime] No token available');
      return;
    }

    try {
      await gpsWebSocket.connect(token);
      setState((prev) => ({ ...prev, isConnected: true }));
    } catch (error) {
      console.error('[useGpsRealtime] Connection failed:', error);
      setState((prev) => ({ ...prev, isConnected: false }));
    }
  }, [token]);

  const disconnect = useCallback(() => {
    gpsWebSocket.disconnect();
    setState((prev) => ({ ...prev, isConnected: false }));
  }, []);

  // Handle position updates
  useEffect(() => {
    const unsubscribe = gpsWebSocket.on('position:update', (data: GpsPositionUpdate) => {
      setState((prev) => {
        const newPositions = new Map(prev.positions);
        newPositions.set(data.trackerId, data);
        return {
          ...prev,
          positions: newPositions,
          lastUpdate: new Date(),
        };
      });
    });

    unsubscribersRef.current.push(unsubscribe);

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle batch position updates
  useEffect(() => {
    const unsubscribe = gpsWebSocket.on('positions:batch', (data: GpsPositionUpdate[]) => {
      setState((prev) => {
        const newPositions = new Map(prev.positions);
        data.forEach((position) => {
          newPositions.set(position.trackerId, position);
        });
        return {
          ...prev,
          positions: newPositions,
          lastUpdate: new Date(),
        };
      });
    });

    unsubscribersRef.current.push(unsubscribe);

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle alerts
  useEffect(() => {
    const unsubscribe = gpsWebSocket.on('alert:new', (data: GpsAlertNotification) => {
      setState((prev) => {
        const newAlerts = [data, ...prev.alerts].slice(0, alertsLimitRef.current);
        return {
          ...prev,
          alerts: newAlerts,
          lastUpdate: new Date(),
        };
      });
    });

    unsubscribersRef.current.push(unsubscribe);

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle geofence events
  useEffect(() => {
    const unsubscribe = gpsWebSocket.on('geofence:event', (data: GeofenceEvent) => {
      setState((prev) => {
        const newEvents = [data, ...prev.geofenceEvents].slice(0, 50);
        return {
          ...prev,
          geofenceEvents: newEvents,
          lastUpdate: new Date(),
        };
      });
    });

    unsubscribersRef.current.push(unsubscribe);

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle disconnect
  useEffect(() => {
    const unsubscribe = gpsWebSocket.on('disconnect', () => {
      setState((prev) => ({ ...prev, isConnected: false }));
    });

    unsubscribersRef.current.push(unsubscribe);

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && token) {
      connect();
    }

    return () => {
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];
    };
  }, [autoConnect, token, connect]);

  // Subscribe to alerts
  useEffect(() => {
    if (state.isConnected && subscribeToAlerts) {
      gpsWebSocket.subscribeToAlerts();
    }
  }, [state.isConnected, subscribeToAlerts]);

  // Subscribe to specific trackers
  useEffect(() => {
    if (state.isConnected && trackerIds.length > 0) {
      trackerIds.forEach((id) => {
        gpsWebSocket.subscribeToTracker(id);
      });
    }
  }, [state.isConnected, trackerIds]);

  // Subscribe to specific geofences
  useEffect(() => {
    if (state.isConnected && geofenceIds.length > 0) {
      geofenceIds.forEach((id) => {
        gpsWebSocket.subscribeToGeofence(id);
      });
    }
  }, [state.isConnected, geofenceIds]);

  const getPosition = useCallback(
    (trackerId: number): GpsPositionUpdate | undefined => {
      return state.positions.get(trackerId);
    },
    [state.positions]
  );

  const getAllPositions = useCallback((): GpsPositionUpdate[] => {
    return Array.from(state.positions.values());
  }, [state.positions]);

  const clearAlerts = useCallback(() => {
    setState((prev) => ({ ...prev, alerts: [] }));
  }, []);

  const clearGeofenceEvents = useCallback(() => {
    setState((prev) => ({ ...prev, geofenceEvents: [] }));
  }, []);

  return {
    isConnected: state.isConnected,
    positions: state.positions,
    alerts: state.alerts,
    geofenceEvents: state.geofenceEvents,
    lastUpdate: state.lastUpdate,
    connect,
    disconnect,
    getPosition,
    getAllPositions,
    clearAlerts,
    clearGeofenceEvents,
    subscribeToTracker: gpsWebSocket.subscribeToTracker.bind(gpsWebSocket),
    unsubscribeFromTracker: gpsWebSocket.unsubscribeFromTracker.bind(gpsWebSocket),
    subscribeToGeofence: gpsWebSocket.subscribeToGeofence.bind(gpsWebSocket),
  };
}

export default useGpsRealtime;
