"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface QueueJob {
  id: string;
  name: string;
  status: string;
  priority: number;
  progressPercent: number | null;
  currentLayer: number | null;
  totalLayers: number | null;
  estimatedPrintTime: number | null;
  printer: { id: string; name: string } | null;
  model: { id: string; name: string; filename: string } | null;
  material: { id: string; name: string; color: string | null } | null;
  queuedAt: string;
  createdAt: string;
}

interface QueueResponse {
  queue: QueueJob[];
  count: number;
  timestamp: string;
}

interface UseJobQueueReturn {
  queue: QueueJob[];
  isLoading: boolean;
  error: string | null;
  cancelJob: (jobId: string) => Promise<void>;
  pauseJob: (jobId: string) => Promise<void>;
  resumeJob: (jobId: string) => Promise<void>;
  reorderJob: (jobId: string, direction: "up" | "down") => Promise<void>;
  refresh: () => void;
}

const POLL_INTERVAL_MS = 10000;

async function jobAction(jobId: string, action: string): Promise<void> {
  const res = await fetch(`/api/jobs/${jobId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to ${action} job`);
  }
}

export function useJobQueue(): UseJobQueueReturn {
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQueue = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/jobs/queue", {
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: QueueResponse = await res.json();
      setQueue(data.queue);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to fetch job queue");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(() => {
    fetchQueue();
  }, [fetchQueue]);

  const cancelJob = useCallback(async (jobId: string) => {
    await jobAction(jobId, "cancel");
    fetchQueue();
  }, [fetchQueue]);

  const pauseJob = useCallback(async (jobId: string) => {
    await jobAction(jobId, "pause");
    fetchQueue();
  }, [fetchQueue]);

  const resumeJob = useCallback(async (jobId: string) => {
    await jobAction(jobId, "resume");
    fetchQueue();
  }, [fetchQueue]);

  const reorderJob = useCallback(async (jobId: string, direction: "up" | "down") => {
    const res = await fetch("/api/jobs/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "move", jobId, direction }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to reorder job");
    }
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    fetchQueue();
    intervalRef.current = setInterval(fetchQueue, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchQueue]);

  return { queue, isLoading, error, cancelJob, pauseJob, resumeJob, reorderJob, refresh };
}
