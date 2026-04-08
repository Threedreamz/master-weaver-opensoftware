"use client";

import { useState } from "react";

interface EmbedDialogProps {
  open: boolean;
  onClose: () => void;
  slug: string;
  isPublished: boolean;
  flowName?: string;
}

type TabId = "inline" | "popup" | "email";

export default function EmbedDialog({
  open,
  onClose,
  slug,
  isPublished,
  flowName = "Formular",
}: EmbedDialogProps) {
  const [activeTab, setActiveTab] = useState<TabId>("inline");
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "");

  const formUrl = `${baseUrl}/embed/${slug}`;

  const inlineCode = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0" allow="camera;microphone"></iframe>`;

  const popupCode = `<script>
(function() {
  var btn = document.createElement('button');
  btn.textContent = 'Formular öffnen';
  btn.style.cssText = 'padding:12px 24px;background:#4C5FD5;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;font-family:sans-serif;';
  btn.addEventListener('click', function() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    var frame = document.createElement('iframe');
    frame.src = '${formUrl}';
    frame.allow = 'camera;microphone';
    frame.style.cssText = 'width:90vw;max-width:720px;height:80vh;border:none;border-radius:12px;background:#fff;';
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
  });
  document.currentScript.parentNode.insertBefore(btn, document.currentScript);
})();
</script>`;

  const emailCode = `<!-- E-Mail Template: ${flowName} -->
<!-- In deinem E-Mail-Editor auf HTML-Ansicht wechseln und diesen Code einfügen -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;background-color:#f9fafb;">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
        <!-- Header -->
        <tr>
          <td style="background:#4C5FD5;padding:32px 40px;text-align:center;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">${flowName}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 8px;color:#374151;font-size:16px;line-height:1.6;">
              Beantworte ein paar kurze Fragen — es dauert weniger als 2 Minuten.
            </p>
            <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.5;">
              Klicke auf den Button, um das Formular zu öffnen.
            </p>
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:8px;background:#4C5FD5;">
                  <a href="${formUrl}" target="_blank"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;font-family:Arial,sans-serif;">
                    Jetzt starten &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 40px;border-top:1px solid #f3f4f6;text-align:center;border-radius:0 0 12px 12px;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Wenn der Button nicht funktioniert:
              <a href="${formUrl}" style="color:#4C5FD5;text-decoration:none;">${formUrl}</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const currentCode = activeTab === "inline" ? inlineCode : activeTab === "popup" ? popupCode : emailCode;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = currentCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  const tabs: { id: TabId; label: string; description: string }[] = [
    { id: "inline", label: "Inline", description: "Direkt in eine Webseite einbetten" },
    { id: "popup", label: "Popup", description: "Als Overlay über einen Button öffnen" },
    { id: "email", label: "E-Mail", description: "HTML-Template mit CTA-Button" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Einbetten</h2>
            <p className="text-xs text-gray-400 mt-0.5">{tabs.find(t => t.id === activeTab)?.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Warning if not published */}
        {!isPublished && (
          <div className="mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 font-medium">
              Dieser Flow ist noch nicht veröffentlicht. Der Embed-Code funktioniert erst nach der Veröffentlichung.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 px-6 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setCopied(false); }}
              className={`px-4 py-2 text-xs font-medium rounded-t-lg border border-b-0 transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-indigo-600 border-gray-200"
                  : "bg-gray-50 text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code block */}
        <div className="px-6 pb-2">
          <div className="border border-gray-200 rounded-lg rounded-tl-none overflow-hidden">
            <pre className="p-4 text-xs text-gray-700 bg-gray-50 overflow-x-auto max-h-64 whitespace-pre-wrap break-all font-mono leading-relaxed">
              {currentCode}
            </pre>
          </div>
          {activeTab === "email" && (
            <p className="mt-2 text-xs text-amber-600">
              ⚠️ E-Mail-Clients blockieren iframes. Dieser Code rendert einen stilisierten CTA-Button, der zur Form verlinkt.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors"
          >
            Schließen
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
          >
            {copied ? "✓ Kopiert!" : "Kopieren"}
          </button>
        </div>
      </div>
    </div>
  );
}
