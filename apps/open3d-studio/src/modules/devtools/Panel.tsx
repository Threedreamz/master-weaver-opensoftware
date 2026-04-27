'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ModulePanelProps } from '@mw/open3d-types';
import { useViewerStore, useModuleStore } from '@mw/open3d-viewer';

// === Theme constants ===
const BG = '#0a0a1a';
const CARD = '#12122a';
const BORDER = '#2a2a4a';
const TEXT = '#e0e0f0';
const MUTED = '#8888aa';
const ACCENT = '#4488ff';
const CYAN = '#00e5ff';
const SUCCESS = '#44cc88';
const DANGER = '#ff4444';

// === Tab definitions ===
type TabId = 'packages' | 'converters' | 'lrp' | 'matrix' | 'services' | 'actions';

const TABS: { id: TabId; label: string }[] = [
  { id: 'packages', label: 'Packages' },
  { id: 'converters', label: 'Converters' },
  { id: 'lrp', label: 'LRP' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'services', label: 'Services' },
  { id: 'actions', label: 'Actions' },
];

// === Static data ===

const PACKAGES = [
  { name: '@mw/open3d-types', version: '0.1.0' },
  { name: '@mw/open3d-viewer', version: '0.1.0' },
  { name: '@mw/open3d-converter', version: '0.1.0' },
  { name: '@mw/open3d-mesh', version: '0.1.0' },
  { name: '@mw/open3d-slicer', version: '0.1.0' },
  { name: '@mw/open3d-cad', version: '0.1.0' },
];

const CONVERTERS = [
  { name: 'STL', inputs: ['OBJ', 'PLY', 'GLB', '3MF'], outputs: ['OBJ', 'PLY', 'GLB'] },
  { name: 'OBJ', inputs: ['STL', 'PLY', 'GLB'], outputs: ['STL', 'PLY', 'GLB'] },
  { name: 'PLY', inputs: ['STL', 'OBJ', 'GLB'], outputs: ['STL', 'OBJ', 'GLB'] },
  { name: 'DXF', inputs: ['SVG'], outputs: ['SVG'] },
  { name: 'SVG', inputs: ['DXF'], outputs: ['DXF'] },
  { name: '3MF', inputs: ['STL', 'OBJ'], outputs: ['STL'] },
  { name: 'Fusion (.f3d)', inputs: ['SCAD'], outputs: ['STL', 'OBJ', 'SCAD'] },
  { name: 'SCAD', inputs: ['F3D'], outputs: ['STL'] },
  { name: 'GLTF/GLB', inputs: ['STL', 'OBJ', 'PLY'], outputs: ['STL', 'OBJ', 'PLY'] },
];

// Format matrix: which conversions are supported
const MATRIX_FORMATS = ['STL', 'OBJ', 'PLY', 'GLB', 'DXF', 'SVG', '3MF', 'F3D', 'SCAD'] as const;

const SUPPORTED_CONVERSIONS: Record<string, Set<string>> = {
  STL: new Set(['OBJ', 'PLY', 'GLB']),
  OBJ: new Set(['STL', 'PLY', 'GLB']),
  PLY: new Set(['STL', 'OBJ', 'GLB']),
  GLB: new Set(['STL', 'OBJ', 'PLY']),
  DXF: new Set(['SVG']),
  SVG: new Set(['DXF']),
  '3MF': new Set(['STL']),
  F3D: new Set(['STL', 'OBJ', 'SCAD']),
  SCAD: new Set(['STL']),
};

const SERVICES = [
  { name: 'open3d-studio', port: 4170, url: null }, // self — always online
  { name: 'open3d-api', port: 4173, url: 'http://localhost:4173/api/health' },
  { name: 'open3d-worker', port: 4174, url: 'http://localhost:4174/api/health' },
  { name: 'open3d-desktop', port: 4178, url: 'http://localhost:4178/api/health' },
];

// === Shared styles ===

const cardStyle: React.CSSProperties = {
  background: CARD,
  borderRadius: '6px',
  border: `1px solid ${BORDER}`,
  padding: '10px 12px',
};

const sectionLabelStyle: React.CSSProperties = {
  color: MUTED,
  fontSize: '10px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '8px',
};

const dotStyle = (color: string): React.CSSProperties => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: color,
  display: 'inline-block',
  flexShrink: 0,
});

const btnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? ACCENT : 'transparent',
  border: `1px solid ${active ? ACCENT : BORDER}`,
  borderRadius: '4px',
  color: active ? '#ffffff' : MUTED,
  padding: '4px 10px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
});

const actionBtnStyle: React.CSSProperties = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: '6px',
  color: TEXT,
  padding: '10px 14px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  transition: 'border-color 0.15s',
};

// === Service health hook ===

interface ServiceHealth {
  status: 'online' | 'offline' | 'checking';
  latency: number | null;
}

function useServiceHealth(services: typeof SERVICES) {
  const [health, setHealth] = useState<Record<string, ServiceHealth>>(() => {
    const initial: Record<string, ServiceHealth> = {};
    for (const s of services) {
      initial[s.name] = s.url
        ? { status: 'checking', latency: null }
        : { status: 'online', latency: 0 };
    }
    return initial;
  });

  const checkAll = useCallback(async () => {
    setHealth((prev) => {
      const next = { ...prev };
      for (const s of services) {
        if (s.url) next[s.name] = { status: 'checking', latency: null };
      }
      return next;
    });

    for (const s of services) {
      if (!s.url) continue;
      const start = performance.now();
      try {
        const res = await fetch(s.url, { signal: AbortSignal.timeout(5000) });
        const latency = Math.round(performance.now() - start);
        setHealth((prev) => ({
          ...prev,
          [s.name]: { status: res.ok ? 'online' : 'offline', latency },
        }));
      } catch {
        setHealth((prev) => ({
          ...prev,
          [s.name]: { status: 'offline', latency: null },
        }));
      }
    }
  }, [services]);

  return { health, checkAll };
}

// === LRP capability type ===

interface LrpCapability {
  name: string;
  runtime?: string;
}

// === Sub-panels ===

function PackagesTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={sectionLabelStyle}>@mw/open3d-* Packages</div>
      {PACKAGES.map((pkg) => (
        <div
          key={pkg.name}
          style={{
            ...cardStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
          }}
        >
          <span style={{ color: TEXT, fontSize: '12px', fontFamily: 'monospace' }}>
            {pkg.name}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: MUTED, fontSize: '11px' }}>v{pkg.version}</span>
            <span style={dotStyle(SUCCESS)} title="Available" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConvertersTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={sectionLabelStyle}>Supported Converters</div>
      {CONVERTERS.map((conv) => (
        <div
          key={conv.name}
          style={{
            ...cardStyle,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '8px 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: TEXT, fontSize: '12px', fontWeight: 600 }}>{conv.name}</span>
            <span style={dotStyle(SUCCESS)} title="Active" />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ color: MUTED, fontSize: '10px' }}>
              In: {conv.inputs.join(', ')}
            </span>
            <span style={{ color: MUTED, fontSize: '10px' }}>
              Out: {conv.outputs.join(', ')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function LrpTab() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [capabilities, setCapabilities] = useState<LrpCapability[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch('http://localhost:4173/api/health', {
          signal: AbortSignal.timeout(5000),
        });
        if (cancelled) return;
        if (res.ok) {
          setStatus('online');
          // Try to get capabilities
          try {
            const capsRes = await fetch('http://localhost:4173/api/capabilities', {
              signal: AbortSignal.timeout(5000),
            });
            if (!cancelled && capsRes.ok) {
              const data = await capsRes.json();
              if (Array.isArray(data)) {
                setCapabilities(data);
              } else if (data.capabilities && Array.isArray(data.capabilities)) {
                setCapabilities(data.capabilities);
              }
            }
          } catch {
            // Capabilities endpoint may not exist — that's fine
          }
        } else {
          setStatus('offline');
        }
      } catch {
        if (!cancelled) setStatus('offline');
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={sectionLabelStyle}>LRP / open3d-api Status</div>
      <div
        style={{
          ...cardStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: TEXT, fontSize: '12px' }}>open3d-api :4173</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              color: status === 'online' ? SUCCESS : status === 'offline' ? DANGER : MUTED,
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            {status === 'checking' ? 'Checking...' : status === 'online' ? 'Online' : 'Offline'}
          </span>
          <span
            style={dotStyle(
              status === 'online' ? SUCCESS : status === 'offline' ? DANGER : MUTED
            )}
          />
        </div>
      </div>

      {status === 'online' && capabilities.length > 0 && (
        <>
          <div style={{ ...sectionLabelStyle, marginTop: '8px' }}>Capabilities</div>
          {capabilities.map((cap, i) => (
            <div
              key={i}
              style={{
                ...cardStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
              }}
            >
              <span style={{ color: TEXT, fontSize: '12px' }}>{cap.name}</span>
              {cap.runtime && (
                <span
                  style={{
                    color: CYAN,
                    fontSize: '10px',
                    background: 'rgba(0, 229, 255, 0.1)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                  }}
                >
                  {cap.runtime}
                </span>
              )}
            </div>
          ))}
        </>
      )}

      {status === 'online' && capabilities.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <span style={{ color: MUTED, fontSize: '11px' }}>
            API online, no capabilities endpoint found
          </span>
        </div>
      )}

      {status === 'offline' && (
        <div
          style={{
            ...cardStyle,
            background: 'rgba(255, 68, 68, 0.06)',
            border: '1px solid rgba(255, 68, 68, 0.2)',
            textAlign: 'center',
          }}
        >
          <span style={{ color: MUTED, fontSize: '11px' }}>
            Start the API with: <code style={{ color: ACCENT }}>pnpm dev --filter=open3d-api</code>
          </span>
        </div>
      )}
    </div>
  );
}

function MatrixTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={sectionLabelStyle}>Format Conversion Matrix</div>
      <div
        style={{
          overflowX: 'auto',
          borderRadius: '6px',
          border: `1px solid ${BORDER}`,
        }}
      >
        <table
          style={{
            borderCollapse: 'collapse',
            fontSize: '10px',
            width: '100%',
            minWidth: '320px',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  background: CARD,
                  color: MUTED,
                  padding: '6px 4px',
                  textAlign: 'left',
                  borderBottom: `1px solid ${BORDER}`,
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                }}
              >
                From \ To
              </th>
              {MATRIX_FORMATS.map((fmt) => (
                <th
                  key={fmt}
                  style={{
                    background: CARD,
                    color: MUTED,
                    padding: '6px 3px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${BORDER}`,
                    fontWeight: 600,
                  }}
                >
                  {fmt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_FORMATS.map((from) => (
              <tr key={from}>
                <td
                  style={{
                    background: CARD,
                    color: TEXT,
                    padding: '5px 6px',
                    fontWeight: 600,
                    borderBottom: `1px solid ${BORDER}`,
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                  }}
                >
                  {from}
                </td>
                {MATRIX_FORMATS.map((to) => {
                  const isSame = from === to;
                  const supported = !isSame && SUPPORTED_CONVERSIONS[from]?.has(to);
                  return (
                    <td
                      key={to}
                      style={{
                        background: BG,
                        textAlign: 'center',
                        padding: '5px 3px',
                        borderBottom: `1px solid ${BORDER}`,
                        color: isSame ? BORDER : supported ? SUCCESS : BORDER,
                      }}
                    >
                      {isSame ? '\u2014' : supported ? '\u2713' : '\u2014'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ color: MUTED, fontSize: '10px', textAlign: 'center' }}>
        <span style={{ color: SUCCESS }}>{'\u2713'}</span> = supported conversion,{' '}
        <span style={{ color: BORDER }}>{'\u2014'}</span> = not available
      </div>
    </div>
  );
}

function ServicesTab() {
  const { health, checkAll } = useServiceHealth(SERVICES);

  useEffect(() => {
    checkAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={sectionLabelStyle}>Service Health</div>
        <button
          onClick={checkAll}
          style={{
            background: 'transparent',
            border: `1px solid ${BORDER}`,
            borderRadius: '4px',
            color: ACCENT,
            padding: '3px 10px',
            fontSize: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
        >
          Refresh
        </button>
      </div>
      {SERVICES.map((svc) => {
        const h = health[svc.name];
        const statusColor =
          h?.status === 'online' ? SUCCESS : h?.status === 'offline' ? DANGER : MUTED;
        const statusLabel =
          h?.status === 'online'
            ? 'Online'
            : h?.status === 'offline'
              ? 'Offline'
              : 'Checking...';
        return (
          <div
            key={svc.name}
            style={{
              ...cardStyle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ color: TEXT, fontSize: '12px', fontWeight: 600 }}>{svc.name}</span>
              <span style={{ color: MUTED, fontSize: '10px' }}>:{svc.port}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {h?.latency != null && h.status === 'online' && (
                <span style={{ color: MUTED, fontSize: '10px' }}>{h.latency}ms</span>
              )}
              <span style={{ color: statusColor, fontSize: '11px', fontWeight: 600 }}>
                {statusLabel}
              </span>
              <span style={dotStyle(statusColor)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionsTab() {
  const reset = useViewerStore((s) => s.reset);
  const loadPersistedState = useModuleStore((s) => s.loadPersistedState);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const apiBase =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OPEN3D_API_URL) ||
    'http://localhost:4173';
  const gatewayBase =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OPENSOFTWARE_GATEWAY_URL) ||
    'http://localhost:4160';

  const testConverters = useCallback(async () => {
    setBusy('converters');
    const start = Date.now();
    try {
      const capRes = await fetch(`${apiBase}/api/lrp/capabilities`, { signal: AbortSignal.timeout(5000) });
      if (!capRes.ok) throw new Error(`capabilities HTTP ${capRes.status}`);
      const caps = await capRes.json();
      const count = Array.isArray(caps.capabilities) ? caps.capabilities.length : 0;
      const elapsed = Date.now() - start;
      showFeedback(`✅ open3d-api reachable — ${count} capabilities, ${elapsed}ms`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showFeedback(`❌ open3d-api check failed: ${msg}`);
    } finally {
      setBusy(null);
    }
  }, [apiBase, showFeedback]);

  const ecosystemAudit = useCallback(async () => {
    setBusy('audit');
    try {
      const res = await fetch(`${gatewayBase}/api/appstore/manifests`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`manifests HTTP ${res.status}`);
      const data = await res.json();
      const s = data.summary ?? {};
      showFeedback(
        `📡 Gateway: ${s.reachable ?? '?'} reachable / ${s.unreachable ?? '?'} unreachable / ${s.total ?? '?'} total`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showFeedback(`❌ ecosystem audit failed: ${msg}`);
    } finally {
      setBusy(null);
    }
  }, [gatewayBase, showFeedback]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={sectionLabelStyle}>Developer Actions</div>

      <button onClick={testConverters} disabled={busy === 'converters'} style={actionBtnStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ color: TEXT, fontSize: '12px', fontWeight: 600 }}>
            {busy === 'converters' ? 'Probing open3d-api…' : 'Test Converters'}
          </span>
          <span style={{ color: MUTED, fontSize: '10px' }}>
            Probe open3d-api at {apiBase} + list registered LRP capabilities
          </span>
        </div>
      </button>

      <button onClick={ecosystemAudit} disabled={busy === 'audit'} style={actionBtnStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ color: TEXT, fontSize: '12px', fontWeight: 600 }}>
            {busy === 'audit' ? 'Fetching manifests…' : 'Run Ecosystem Audit'}
          </span>
          <span style={{ color: MUTED, fontSize: '10px' }}>
            Ping opensoftware-gateway (aggregated manifests) at {gatewayBase}
          </span>
        </div>
      </button>

      <button
        onClick={() => {
          reset();
          showFeedback('Viewer cache cleared');
        }}
        style={actionBtnStyle}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ color: TEXT, fontSize: '12px', fontWeight: 600 }}>Clear Viewer Cache</span>
          <span style={{ color: MUTED, fontSize: '10px' }}>
            Reset viewer state, remove loaded models
          </span>
        </div>
      </button>

      <button
        onClick={() => {
          loadPersistedState();
          showFeedback('Modules reloaded from storage');
        }}
        style={actionBtnStyle}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ color: TEXT, fontSize: '12px', fontWeight: 600 }}>Reload Modules</span>
          <span style={{ color: MUTED, fontSize: '10px' }}>
            Reload module state from localStorage
          </span>
        </div>
      </button>

      {feedback && (
        <div
          style={{
            background: 'rgba(68, 136, 255, 0.1)',
            border: '1px solid rgba(68, 136, 255, 0.3)',
            borderRadius: '6px',
            padding: '8px 12px',
            textAlign: 'center',
          }}
        >
          <span style={{ color: ACCENT, fontSize: '12px' }}>{feedback}</span>
        </div>
      )}
    </div>
  );
}

// === Main Panel ===

export function DevToolsPanel({ isActive, onClose }: ModulePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('packages');

  if (!isActive) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: TEXT }}>Dev Tools</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: MUTED,
            cursor: 'pointer',
            fontSize: '18px',
            padding: '2px 6px',
            lineHeight: 1,
          }}
          aria-label="Close dev tools panel"
        >
          &times;
        </button>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={btnStyle(activeTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ minHeight: '200px' }}>
        {activeTab === 'packages' && <PackagesTab />}
        {activeTab === 'converters' && <ConvertersTab />}
        {activeTab === 'lrp' && <LrpTab />}
        {activeTab === 'matrix' && <MatrixTab />}
        {activeTab === 'services' && <ServicesTab />}
        {activeTab === 'actions' && <ActionsTab />}
      </div>
    </div>
  );
}
