'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useWorkflowStore } from '@mw/open3d-viewer';
import type { WorkflowRun, WorkflowPhase, ResourceSnapshot } from '@mw/open3d-types';

/** Phases that should trigger polling */
const ACTIVE_PHASES: WorkflowPhase[] = ['queued', 'running'];

/** Phases that mean the run has ended */
const TERMINAL_PHASES: WorkflowPhase[] = ['complete', 'failed', 'paused'];

const RUN_POLL_INTERVAL = 2000;
const RESOURCE_POLL_INTERVAL = 5000;

/**
 * Polling hook for workflow runs — adapted from ODYN Arena's 2-second polling pattern.
 *
 * When a runId is active and the phase is 'queued' or 'running':
 * - Polls /api/workflows/runs/:runId every 2s
 * - Polls /api/resources every 5s
 * Stops automatically on terminal phases.
 */
export function useWorkflowPolling(runId?: string) {
  const store = useWorkflowStore();
  const runTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resourceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeRunId = runId ?? store.activeRunId;
  const run = store.currentRun;
  const resources = store.resources;
  const isPolling = store.isPolling;

  // --- Polling logic ---

  const stopPolling = useCallback(() => {
    if (runTimerRef.current) {
      clearInterval(runTimerRef.current);
      runTimerRef.current = null;
    }
    if (resourceTimerRef.current) {
      clearInterval(resourceTimerRef.current);
      resourceTimerRef.current = null;
    }
    store.setPolling(false);
  }, [store]);

  const pollRun = useCallback(
    async (rid: string) => {
      try {
        const res = await fetch(`/api/workflows/runs/${rid}`);
        if (!res.ok) {
          store.setError(`Run poll failed: ${res.status}`);
          return;
        }
        const data: WorkflowRun = await res.json();
        store.updateRun(data);

        // Stop polling on terminal phase
        if (TERMINAL_PHASES.includes(data.phase)) {
          stopPolling();
        }
      } catch (err) {
        store.setError(err instanceof Error ? err.message : 'Run poll error');
      }
    },
    [store, stopPolling],
  );

  const pollResources = useCallback(async () => {
    try {
      const res = await fetch('/api/resources');
      if (!res.ok) return;
      const data: ResourceSnapshot = await res.json();
      store.updateResources(data);
    } catch {
      // Resource polling is best-effort — don't surface errors
    }
  }, [store]);

  // Start/stop polling based on active run phase
  useEffect(() => {
    if (!activeRunId) {
      stopPolling();
      return;
    }

    const phase = run?.phase;
    if (phase && !ACTIVE_PHASES.includes(phase)) {
      stopPolling();
      return;
    }

    // Start polling
    store.setPolling(true);

    // Immediate first poll
    pollRun(activeRunId);
    pollResources();

    runTimerRef.current = setInterval(() => pollRun(activeRunId), RUN_POLL_INTERVAL);
    resourceTimerRef.current = setInterval(pollResources, RESOURCE_POLL_INTERVAL);

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRunId, run?.phase]);

  // Recover active run from localStorage on mount
  useEffect(() => {
    store.recoverActiveRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Actions ---

  const startRun = useCallback(
    async (workflowId: string): Promise<string | null> => {
      try {
        store.setError(null);
        const res = await fetch(`/api/workflows/${workflowId}/run`, {
          method: 'POST',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          store.setError(body.error ?? `Start failed: ${res.status}`);
          return null;
        }
        const data: { runId: string; run: WorkflowRun } = await res.json();
        store.setActiveRunId(data.runId);
        store.updateRun(data.run);
        return data.runId;
      } catch (err) {
        store.setError(err instanceof Error ? err.message : 'Failed to start run');
        return null;
      }
    },
    [store],
  );

  const cancelRun = useCallback(async () => {
    if (!activeRunId) return;
    try {
      await fetch(`/api/workflows/runs/${activeRunId}/cancel`, { method: 'POST' });
      stopPolling();
      store.clearRun();
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Cancel failed');
    }
  }, [activeRunId, store, stopPolling]);

  const retryRun = useCallback(async () => {
    if (!run?.workflowId) return;
    store.clearRun();
    return startRun(run.workflowId);
  }, [run?.workflowId, store, startRun]);

  const pauseRun = useCallback(async () => {
    if (!activeRunId) return;
    try {
      await fetch(`/api/workflows/runs/${activeRunId}/pause`, { method: 'POST' });
      // Next poll will pick up the 'paused' phase and stop polling
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Pause failed');
    }
  }, [activeRunId, store]);

  return {
    run,
    steps: run?.stepResults ?? [],
    resources,
    isPolling,
    startRun,
    cancelRun,
    retryRun,
    pauseRun,
  };
}
