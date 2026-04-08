'use client';

import { useState, useMemo } from 'react';
import type { ModulePanelProps, WorkflowPreset, WorkflowStepResult } from '@mw/open3d-types';
import { useWorkflowStore, BUILTIN_PRESETS } from '@mw/open3d-viewer';
import { useWorkflowPolling } from '../../hooks/use-workflow-polling';
import { PhaseIndicator } from './PhaseIndicator';

type TabId = 'presets' | 'builder' | 'monitor';

const CATEGORY_COLORS: Record<string, string> = {
  conversion: '#4488ff',
  'ai-generation': '#a855f7',
  manufacturing: '#22c55e',
  analysis: '#f59e0b',
};

const ICON_MAP: Record<string, string> = {
  Printer: '\u{1F5A8}',
  Sparkles: '\u2728',
  Camera: '\u{1F4F7}',
  Globe: '\u{1F310}',
  Play: '\u25B6',
  Pause: '\u23F8',
  Square: '\u25A0',
  RotateCw: '\u21BB',
};

function getIcon(name: string): string {
  return ICON_MAP[name] ?? '\u2699';
}

// === Step status styling ===

const STATUS_COLORS: Record<string, string> = {
  pending: '#555570',
  queued: '#f59e0b',
  running: '#00e5ff',
  complete: '#22c55e',
  failed: '#ef4444',
  skipped: '#8888aa',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// === Subcomponents ===

function PresetCard({
  preset,
  onSelect,
}: {
  preset: WorkflowPreset;
  onSelect: (preset: WorkflowPreset) => void;
}) {
  const categoryColor = CATEGORY_COLORS[preset.category] ?? '#4488ff';

  return (
    <button
      onClick={() => onSelect(preset)}
      style={{
        background: '#12122a',
        border: '1px solid #2a2a4a',
        borderRadius: '8px',
        padding: '14px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.2s, background 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = '#4488ff';
        (e.currentTarget as HTMLButtonElement).style.background = '#1a1a3a';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a4a';
        (e.currentTarget as HTMLButtonElement).style.background = '#12122a';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '20px' }}>{getIcon(preset.icon)}</span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: categoryColor,
            background: `${categoryColor}18`,
            padding: '2px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase',
          }}
        >
          {preset.category.replace('-', ' ')}
        </span>
      </div>
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#e0e0f0' }}>{preset.name}</span>
      <span style={{ fontSize: '11px', color: '#8888aa', lineHeight: '1.4' }}>
        {preset.description}
      </span>
      <span style={{ fontSize: '10px', color: '#555570' }}>
        {preset.steps.length} steps
      </span>
    </button>
  );
}

function StepCard({ result, name, index }: { result?: WorkflowStepResult; name: string; index: number }) {
  const status = result?.status ?? 'pending';
  const dotColor = STATUS_COLORS[status] ?? '#555570';

  return (
    <div
      style={{
        background: '#12122a',
        border: '1px solid #2a2a4a',
        borderRadius: '6px',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
          boxShadow: status === 'running' ? `0 0 6px ${dotColor}` : 'none',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#e0e0f0', fontWeight: 500 }}>
            {index + 1}. {name}
          </span>
          {result?.duration != null && (
            <span style={{ fontSize: '10px', color: '#8888aa' }}>
              {formatDuration(result.duration)}
            </span>
          )}
        </div>
        {result?.error && (
          <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
            {result.error}
          </span>
        )}
      </div>
    </div>
  );
}

function ConnectingLine() {
  return (
    <div
      style={{
        width: '2px',
        height: '12px',
        background: '#2a2a4a',
        marginLeft: '14px',
      }}
    />
  );
}

// === Tab views ===

function PresetsView({ onSelect }: { onSelect: (preset: WorkflowPreset) => void }) {
  const presets = useWorkflowStore((s) => s.presets);
  const allPresets = presets.length > 0 ? presets : BUILTIN_PRESETS;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '8px',
      }}
    >
      {allPresets.map((preset) => (
        <PresetCard key={preset.id} preset={preset} onSelect={onSelect} />
      ))}
    </div>
  );
}

function BuilderView({
  onRun,
  onPause,
  onCancel,
}: {
  onRun: () => void;
  onPause: () => void;
  onCancel: () => void;
}) {
  const { run, steps, isPolling } = useWorkflowPolling();
  const currentRun = useWorkflowStore((s) => s.currentRun);
  const workflows = useWorkflowStore((s) => s.workflows);

  // Find the workflow definition for the current run
  const workflow = useMemo(() => {
    if (!currentRun?.workflowId) return null;
    return workflows.find((w) => w.id === currentRun.workflowId) ?? null;
  }, [currentRun?.workflowId, workflows]);

  if (!workflow && !currentRun) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <p style={{ color: '#8888aa', fontSize: '12px' }}>
          No workflow selected. Choose a preset to get started.
        </p>
      </div>
    );
  }

  const stepDefs = workflow?.steps ?? [];
  const phase = currentRun?.phase ?? 'draft';
  const isRunning = phase === 'running' || phase === 'queued';
  const isTerminal = phase === 'complete' || phase === 'failed';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Workflow name */}
      {workflow && (
        <div style={{ marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e0e0f0' }}>
            {workflow.name}
          </span>
          {workflow.description && (
            <p style={{ fontSize: '11px', color: '#8888aa', margin: '4px 0 0' }}>
              {workflow.description}
            </p>
          )}
        </div>
      )}

      {/* Step list */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {stepDefs.map((step, i) => {
          const result = steps.find((r) => r.stepId === step.id);
          return (
            <div key={step.id}>
              {i > 0 && <ConnectingLine />}
              <StepCard result={result} name={step.name} index={i} />
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        {!isRunning && !isTerminal && (
          <ActionButton label="Run" icon="Play" color="#22c55e" onClick={onRun} />
        )}
        {isRunning && (
          <>
            <ActionButton label="Pause" icon="Pause" color="#f59e0b" onClick={onPause} />
            <ActionButton label="Cancel" icon="Square" color="#ef4444" onClick={onCancel} />
          </>
        )}
        {isTerminal && phase === 'failed' && (
          <ActionButton label="Retry" icon="RotateCw" color="#4488ff" onClick={onRun} />
        )}
      </div>
    </div>
  );
}

function MonitorView() {
  const { run, resources } = useWorkflowPolling();
  const workflows = useWorkflowStore((s) => s.workflows);

  if (!run) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <p style={{ color: '#8888aa', fontSize: '12px' }}>
          No active run. Start a workflow to see live monitoring.
        </p>
      </div>
    );
  }

  const workflow = workflows.find((w) => w.id === run.workflowId);
  const totalSteps = workflow?.steps.length ?? run.stepResults.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Phase indicator */}
      <div
        style={{
          background: '#12122a',
          border: '1px solid #2a2a4a',
          borderRadius: '8px',
          padding: '12px',
        }}
      >
        <span style={{ fontSize: '11px', color: '#8888aa', marginBottom: '8px', display: 'block' }}>
          Phase
        </span>
        <PhaseIndicator
          phase={run.phase}
          currentStepIndex={run.currentStepIndex}
          totalSteps={totalSteps}
        />
      </div>

      {/* Step progress */}
      <div
        style={{
          background: '#12122a',
          border: '1px solid #2a2a4a',
          borderRadius: '8px',
          padding: '12px',
        }}
      >
        <span style={{ fontSize: '11px', color: '#8888aa', marginBottom: '8px', display: 'block' }}>
          Step Progress
        </span>
        <div style={{ display: 'flex', gap: '3px' }}>
          {run.stepResults.map((step, i) => (
            <div
              key={step.stepId}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                background: STATUS_COLORS[step.status] ?? '#2a2a4a',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          <span style={{ fontSize: '10px', color: '#8888aa' }}>
            {run.stepResults.filter((s) => s.status === 'complete').length}/{totalSteps} complete
          </span>
          {run.error && (
            <span style={{ fontSize: '10px', color: '#ef4444' }}>{run.error}</span>
          )}
        </div>
      </div>

      {/* Energy metrics */}
      {run.energy && (
        <div
          style={{
            background: '#12122a',
            border: '1px solid #2a2a4a',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <span
            style={{ fontSize: '11px', color: '#8888aa', marginBottom: '8px', display: 'block' }}
          >
            Energy Metrics
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <MetricCell label="Energy" value={`${run.energy.totalWh.toFixed(2)} Wh`} />
            <MetricCell label="CO2" value={`${run.energy.totalCO2g.toFixed(1)} g`} />
            <MetricCell label="Peak CPU" value={`${run.energy.peakCpuPercent.toFixed(0)}%`} />
            <MetricCell label="Peak Memory" value={`${run.energy.peakMemoryMb.toFixed(0)} MB`} />
          </div>
        </div>
      )}

      {/* Resource snapshot */}
      {resources && (
        <div
          style={{
            background: '#12122a',
            border: '1px solid #2a2a4a',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <span
            style={{ fontSize: '11px', color: '#8888aa', marginBottom: '8px', display: 'block' }}
          >
            System Resources
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <MetricCell label="CPU" value={`${resources.cpuPercent.toFixed(0)}%`} />
            <MetricCell
              label="Memory"
              value={`${resources.memoryUsedMb.toFixed(0)}/${resources.memoryTotalMb.toFixed(0)} MB`}
            />
            <MetricCell
              label="GPU"
              value={resources.gpuPercent != null ? `${resources.gpuPercent.toFixed(0)}%` : 'N/A'}
            />
            <MetricCell label="Jobs" value={`${resources.activeJobs}`} />
          </div>
        </div>
      )}
    </div>
  );
}

// === Utility components ===

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: '10px', color: '#555570', display: 'block' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#e0e0f0', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  color,
  onClick,
}: {
  label: string;
  icon: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        background: `${color}18`,
        border: `1px solid ${color}40`,
        borderRadius: '6px',
        color,
        padding: '8px 12px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 600,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = `${color}30`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = `${color}18`;
      }}
    >
      <span>{getIcon(icon)}</span>
      {label}
    </button>
  );
}

// === Main Panel ===

export function WorkflowPanel({ moduleId, isActive, onClose }: ModulePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('presets');
  const { startRun, cancelRun, retryRun, pauseRun } = useWorkflowPolling();
  const store = useWorkflowStore();
  const lastError = useWorkflowStore((s) => s.lastError);
  const currentRun = useWorkflowStore((s) => s.currentRun);

  // When a preset is selected, create a workflow from it and start it
  const handlePresetSelect = async (preset: WorkflowPreset) => {
    // Create workflow from preset
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preset.name,
          description: preset.description,
          presetId: preset.id,
          steps: preset.steps.map((s, i) => ({
            ...s,
            id: `${preset.id}-step-${i}`,
          })),
        }),
      });
      if (!res.ok) {
        store.setError('Failed to create workflow');
        return;
      }
      const workflow = await res.json();
      store.upsertWorkflow(workflow);

      // Start the run
      const runId = await startRun(workflow.id);
      if (runId) {
        setActiveTab('monitor');
      }
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Failed to create workflow');
    }
  };

  const handleRun = async () => {
    if (currentRun?.workflowId) {
      const runId = await startRun(currentRun.workflowId);
      if (runId) setActiveTab('monitor');
    }
  };

  // Auto-switch to monitor when a run becomes active
  const effectiveTab = currentRun && activeTab === 'presets' ? activeTab : activeTab;

  if (!isActive) return null;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'presets', label: 'Presets' },
    { id: 'builder', label: 'Builder' },
    { id: 'monitor', label: 'Monitor' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0f0' }}>Workflows</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#8888aa',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '2px 6px',
            lineHeight: 1,
          }}
          aria-label="Close workflow panel"
        >
          &times;
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0',
          background: '#0a0a1a',
          borderRadius: '6px',
          padding: '2px',
          border: '1px solid #2a2a4a',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '6px 0',
              fontSize: '11px',
              fontWeight: effectiveTab === tab.id ? 600 : 400,
              color: effectiveTab === tab.id ? '#e0e0f0' : '#8888aa',
              background: effectiveTab === tab.id ? '#1a1a3a' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {tab.label}
            {tab.id === 'monitor' && currentRun && (
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#00e5ff',
                  marginLeft: '4px',
                  verticalAlign: 'middle',
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {lastError && (
        <div
          style={{
            background: '#ef444418',
            border: '1px solid #ef444440',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '11px',
            color: '#ef4444',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{lastError}</span>
          <button
            onClick={() => store.setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '0 4px',
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Tab content */}
      {effectiveTab === 'presets' && <PresetsView onSelect={handlePresetSelect} />}
      {effectiveTab === 'builder' && (
        <BuilderView onRun={handleRun} onPause={pauseRun} onCancel={cancelRun} />
      )}
      {effectiveTab === 'monitor' && <MonitorView />}
    </div>
  );
}
