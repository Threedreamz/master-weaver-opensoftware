'use client';

interface InfoPanelProps {
  data: Record<string, string | number | boolean | undefined>;
  title?: string;
}

export function InfoPanel({ data, title }: InfoPanelProps) {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return null;

  return (
    <div className="card">
      {title && <span className="label" style={{ marginBottom: '0.5rem', display: 'block' }}>{title}</span>}
      <div className="info-grid">
        {entries.map(([key, value]) => (
          <div key={key} className="info-item">
            <span className="label">{key}</span>
            <span className="value">
              {typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
               typeof value === 'number' ? value.toLocaleString() : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
