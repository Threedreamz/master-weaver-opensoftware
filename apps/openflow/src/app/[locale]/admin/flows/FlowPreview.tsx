// FlowPreview — compact static thumbnail of a flow's first step
// Renders simplified visual representations of component types.
// Uses actual config data (text, labels) where available for recognisable previews.

interface PreviewComponent {
  id: string;
  componentType: string;
  label?: string | null;
  config: string | Record<string, unknown> | null;
  sortOrder: number;
}

interface PreviewStep {
  id: string;
  label: string;
  config: string | Record<string, unknown> | null;
  components: PreviewComponent[];
}

function parseJson<T>(value: string | T | null): T {
  if (value === null || value === undefined) return {} as T;
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return {} as T; }
  }
  return value as T;
}

function ComponentPreview({ comp }: { comp: PreviewComponent }) {
  const cfg = parseJson<Record<string, unknown>>(comp.config);

  switch (comp.componentType) {
    case "heading": {
      const text = (cfg.text as string) || comp.label || "";
      return (
        <div className="space-y-0.5">
          {text ? (
            <p
              className="font-bold text-gray-800 leading-tight truncate"
              style={{ fontSize: "8px" }}
            >
              {text}
            </p>
          ) : (
            <div className="h-2.5 bg-gray-700 rounded" style={{ width: "60%" }} />
          )}
        </div>
      );
    }

    case "paragraph": {
      const text = (cfg.text as string) || "";
      if (text) {
        return (
          <p
            className="text-gray-500 leading-snug line-clamp-2"
            style={{ fontSize: "7px" }}
          >
            {text}
          </p>
        );
      }
      return (
        <div className="space-y-1">
          <div className="h-1.5 bg-gray-300 rounded w-full" />
          <div className="h-1.5 bg-gray-300 rounded" style={{ width: "85%" }} />
          <div className="h-1.5 bg-gray-300 rounded" style={{ width: "60%" }} />
        </div>
      );
    }

    case "text-input":
    case "email-input":
    case "phone-input":
    case "number-input":
      return (
        <div className="space-y-0.5">
          {comp.label && (
            <p className="text-gray-500" style={{ fontSize: "7px" }}>{comp.label}</p>
          )}
          <div className="h-4 border border-gray-300 rounded bg-white" />
        </div>
      );

    case "text-area":
      return (
        <div className="space-y-0.5">
          {comp.label && (
            <p className="text-gray-500" style={{ fontSize: "7px" }}>{comp.label}</p>
          )}
          <div className="h-7 border border-gray-300 rounded bg-white" />
        </div>
      );

    case "radio-group":
    case "checkbox-group": {
      const isCheck = comp.componentType === "checkbox-group";
      const rawOpts = (cfg.options as string) ?? "";
      const lines = typeof rawOpts === "string"
        ? rawOpts.split("\n").filter(Boolean).slice(0, 3)
        : [];
      const items = lines.length > 0 ? lines : ["Option 1", "Option 2"];
      return (
        <div className="space-y-1">
          {comp.label && (
            <p className="text-gray-500" style={{ fontSize: "7px" }}>{comp.label}</p>
          )}
          {items.map((l, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 border border-gray-400 bg-white flex-shrink-0 ${isCheck ? "rounded-sm" : "rounded-full"}`} />
              <p className="text-gray-600 truncate" style={{ fontSize: "7px" }}>{l}</p>
            </div>
          ))}
        </div>
      );
    }

    case "dropdown":
      return (
        <div className="space-y-0.5">
          {comp.label && (
            <p className="text-gray-500" style={{ fontSize: "7px" }}>{comp.label}</p>
          )}
          <div className="h-4 border border-gray-300 rounded bg-white flex items-center justify-between px-1.5">
            <p className="text-gray-400 truncate" style={{ fontSize: "7px" }}>Bitte wählen</p>
            <span className="text-gray-400" style={{ fontSize: "6px" }}>▼</span>
          </div>
        </div>
      );

    case "card-selector":
    case "image-choice": {
      const opts = (cfg.options as Array<{ label?: string; subtitle?: string; imageUrl?: string }>) ?? [];
      const count = Math.min(opts.length || 2, 3);
      return (
        <div className="space-y-0.5">
          {comp.label && (
            <p className="text-gray-500" style={{ fontSize: "7px" }}>{comp.label}</p>
          )}
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
            {Array.from({ length: count }).map((_, i) => {
              const opt = opts[i];
              return (
                <div
                  key={i}
                  className="border border-gray-200 rounded bg-white flex flex-col items-center p-1 gap-0.5"
                  style={{ minHeight: "24px" }}
                >
                  {opt?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={opt.imageUrl}
                      alt={opt.label ?? ""}
                      className="w-4 h-4 object-contain"
                    />
                  ) : (
                    <div className="w-3 h-3 bg-gray-200 rounded-sm" />
                  )}
                  {opt?.label && (
                    <p
                      className="text-gray-700 text-center font-medium leading-none truncate w-full"
                      style={{ fontSize: "6px" }}
                    >
                      {opt.label}
                    </p>
                  )}
                  {opt?.subtitle && (
                    <p
                      className="text-gray-400 text-center leading-none truncate w-full"
                      style={{ fontSize: "6px" }}
                    >
                      {opt.subtitle}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case "button":
      return (
        <div className="flex">
          <div className="h-4 bg-indigo-500 rounded px-2 flex items-center">
            <div className="h-1.5 bg-white/80 rounded" style={{ width: "32px" }} />
          </div>
        </div>
      );

    case "divider":
      return <div className="h-px bg-gray-300 w-full my-0.5" />;

    case "image-block":
      return (
        <div className="h-8 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );

    case "slider":
      return (
        <div className="space-y-0.5">
          {comp.label && (
            <p className="text-gray-500" style={{ fontSize: "7px" }}>{comp.label}</p>
          )}
          <div className="h-1.5 bg-gray-200 rounded-full relative">
            <div className="h-1.5 bg-indigo-400 rounded-full" style={{ width: "40%" }} />
          </div>
        </div>
      );

    case "rating":
      return (
        <div className="flex gap-0.5 items-center">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={i <= 3 ? "text-yellow-400" : "text-gray-300"} style={{ fontSize: "8px" }}>★</span>
          ))}
        </div>
      );

    case "date-picker":
      return (
        <div className="space-y-0.5">
          {comp.label && (
            <p className="text-gray-500" style={{ fontSize: "7px" }}>{comp.label}</p>
          )}
          <div className="h-4 border border-gray-300 rounded bg-white flex items-center px-1.5 gap-1">
            <div className="h-1.5 bg-gray-300 rounded" style={{ width: "55%" }} />
            <svg className="w-2 h-2 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      );

    default:
      return <div className="h-3 bg-gray-200 rounded" />;
  }
}

export function FlowPreview({ step }: { step: PreviewStep | null | undefined }) {
  if (!step) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-1.5">
        <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-[10px] text-gray-400">Keine Seite</p>
      </div>
    );
  }

  const stepConfig = parseJson<Record<string, unknown>>(step.config);
  const title = (stepConfig.title as string) || step.label || "";
  const components = [...step.components]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 5);

  return (
    <div className="p-2.5 space-y-2 h-full overflow-hidden bg-white">
      {title && (
        <p
          className="font-bold text-gray-800 leading-tight truncate"
          style={{ fontSize: "8px" }}
        >
          {title}
        </p>
      )}
      {components.map((comp) => (
        <ComponentPreview key={comp.id} comp={comp} />
      ))}
      {components.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-1 pt-4">
          <svg className="w-4 h-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          <p className="text-[9px] text-gray-300">Leere Seite</p>
        </div>
      )}
      {step.components.length > 5 && (
        <p className="text-[9px] text-gray-400 text-center">+{step.components.length - 5} weitere</p>
      )}
    </div>
  );
}
