"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface MonitoringSummary {
  total: number;
  online: number;
  printing: number;
  idle: number;
  error: number;
  maintenance: number;
  offline: number;
  utilizationPercent: number;
}

interface PrinterMonitoringState {
  id: string;
  name: string;
  technology: string;
  protocol: string;
  status: string;
  connected: boolean;
  temperature?: { hotend?: number; bed?: number; chamber?: number };
  currentJob?: {
    id: string;
    name: string;
    progress: number;
    currentLayer?: number;
    totalLayers?: number;
    printStartedAt: string | null;
    estimatedPrintTime?: number;
    timeElapsed?: number;
    timeRemaining?: number;
  };
  buildVolume?: { x: number; y: number; z: number };
  lastSeenAt: string | null;
}

interface MonitoringOverview {
  printers: PrinterMonitoringState[];
  summary: MonitoringSummary;
}

const EMPTY_OVERVIEW: MonitoringOverview = {
  printers: [],
  summary: {
    total: 0,
    online: 0,
    printing: 0,
    idle: 0,
    error: 0,
    maintenance: 0,
    offline: 0,
    utilizationPercent: 0,
  },
};

export function useMonitoring(pollInterval = 5000) {
  const [overview, setOverview] = useState<MonitoringOverview>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const fetchingRef = useRef(false);

  const fetchOverview = useCallback(async () => {
    // Skip if a fetch is already in progress (API can be slow due to adapter timeouts)
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const res = await fetch("/api/monitoring/overview", {
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
        setError(null);
      } else {
        setError("Failed to fetch monitoring data");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Failed to fetch monitoring data");
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, pollInterval);
    return () => {
      clearInterval(interval);
      controllerRef.current?.abort();
    };
  }, [fetchOverview, pollInterval]);

  return { overview, loading, error, refresh: fetchOverview };
}
