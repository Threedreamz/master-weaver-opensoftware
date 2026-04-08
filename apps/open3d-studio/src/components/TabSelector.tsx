'use client';

interface TabSelectorProps {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
}

export function TabSelector({ tabs, active, onChange }: TabSelectorProps) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button key={tab.id} className={`tab ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
