"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface PrinterTemperature {
  hotend?: number;
  bed?: number;
  chamber?: number;
}

interface PrinterStatus {
  id: string;
  name: string;
  protocol: string;
  status: "online" | "offline" | "printing" | "paused" | "error" | "maintenance";
  progress?: number;
  temperature?: PrinterTemperature;
  currentLayer?: number;
  totalLayers?: number;
  timeRemaining?: number;
  filename?: string;
  connected: boolean;
  error?: string;
}

interface PrinterStatusResponse {
  printers: PrinterStatus[];
  timestamp: string;
  count: number;
}

interface UsePrinterStatusReturn {
  printers: PrinterStatus[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const POLL_INTERVAL_MS = 5000;
const DEBOUNCE_MS = 1000;

export function usePrinterStatus(): UsePrinterStatusReturn {
  const [printers, setPrinters] = useState<PrinterStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/printers/status", {
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: PrinterStatusResponse = await res.json();
      setPrinters(data.printers);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Ignore aborted requests
      }
      setError(err instanceof Error ? err.message : "Failed to fetch printer status");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current < DEBOUNCE_MS) {
      return; // Debounce rapid refreshes
    }
    lastRefreshRef.current = now;
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();

    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStatus]);

  return { printers, isLoading, error, refresh };
}
