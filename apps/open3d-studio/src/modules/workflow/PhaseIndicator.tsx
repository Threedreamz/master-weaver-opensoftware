'use client';

import type { WorkflowPhase } from '@mw/open3d-types';

const PHASE_ORDER: WorkflowPhase[] = ['draft', 'queued', 'running', 'complete'];

const PHASE_LABELS: Record<WorkflowPhase, string> = {
  draft: 'Draft',
  queued: 'Queued',
  running: 'Running',
  paused: 'Paused',
  failed: 'Failed',
  complete: 'Complete',
};

interface PhaseIndicatorProps {
  phase: WorkflowPhase;
  currentStepIndex: number;
  totalSteps: number;
}

/**
 * Vertical phase timeline — adapted from ODYN Arena's ArenaPhaseIndicator.
 * Shows progression through Draft -> Queued -> Running -> Complete (or Failed).
 */
export function PhaseIndicator({ phase, currentStepIndex, totalSteps }: PhaseIndicatorProps) {
  // If failed, replace 'complete' with 'failed' in display
  const displayPhases: WorkflowPhase[] =
    phase === 'failed'
      ? ['draft', 'queued', 'running', 'failed']
      : phase === 'paused'
        ? ['draft', 'queued', 'running', 'paused']
        : PHASE_ORDER;

  const currentPhaseIndex = displayPhases.indexOf(phase);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', padding: '8px 0' }}>
      {displayPhases.map((p, i) => {
        const isComplete = i < currentPhaseIndex;
        const isCurrent = i === currentPhaseIndex;
        const isUpcoming = i > currentPhaseIndex;
        const isLast = i === displayPhases.length - 1;

        const dotColor = isComplete
          ? '#22c55e'
          : isCurrent
            ? p === 'failed'
              ? '#ef4444'
              : '#00e5ff'
            : '#2a2a4a';

        const lineColor = isComplete ? '#22c55e' : '#2a2a4a';

        return (
          <div key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            {/* Dot + connecting line */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '16px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: dotColor,
                  border: isCurrent ? `2px solid ${dotColor}` : 'none',
                  boxShadow: isCurrent
                    ? `0 0 8px ${dotColor}, 0 0 16px ${dotColor}40`
                    : 'none',
                  animation: isCurrent && (p === 'queued' || p === 'running')
                    ? 'pulse-dot 1.5s ease-in-out infinite'
                    : 'none',
                  flexShrink: 0,
                }}
              />
              {!isLast && (
                <div
                  style={{
                    width: '2px',
                    height: '24px',
                    background: lineColor,
                    marginTop: '2px',
                  }}
                />
              )}
            </div>

            {/* Label + info */}
            <div style={{ paddingTop: '0', minHeight: isLast ? 'auto' : '38px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: isCurrent ? 600 : 400,
                  color: isUpcoming ? '#555570' : isCurrent ? '#e0e0f0' : '#8888aa',
                }}
              >
                {PHASE_LABELS[p]}
              </span>
              {isCurrent && p === 'running' && totalSteps > 0 && (
                <span
                  style={{
                    fontSize: '10px',
                    color: '#00e5ff',
                    marginLeft: '8px',
                  }}
                >
                  Step {currentStepIndex + 1}/{totalSteps}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
