"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import {
  Home,
  MoreHorizontal,
  FlaskConical,
  Users,
  Settings,
  Eye,
  MessageSquare,
  Sparkles,
  GitPullRequest,
} from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";
import CommentsPanel from "./CommentsPanel";
import AIGenerateDialog from "./AIGenerateDialog";

interface FlowDetailNavProps {
  locale: string;
  flowId: string;
  flowName: string;
  flowSlug: string;
  flowStatus: string;
  reviewStatus?: string;  // "none" | "in_review" | "approved" | "rejected"
}

export function FlowDetailNav({
  locale,
  flowId,
  flowName,
  flowSlug,
  flowStatus,
  reviewStatus,
}: FlowDetailNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isSavingAndLeaving, setIsSavingAndLeaving] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAIGenerate, setShowAIGenerate] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const basePath = `/${locale}/flow/${flowId}`;
  const homePath = `/${locale}/admin`;

  const tabs = [
    {
      id: "build",
      label: "Bearbeiten",
      href: `${basePath}/build`,
    },
    {
      id: "integrations",
      label: "Integrieren",
      href: `${basePath}/integrations`,
    },
    {
      id: "results",
      label: "Ergebnisse",
      href: `${basePath}/results`,
    },
  ];

  // Determine active tab
  let activeTabId = "build";
  if (pathname.includes(`${basePath}/integrations`)) {
    activeTabId = "integrations";
  } else if (pathname.includes(`${basePath}/results`)) {
    activeTabId = "results";
  }

  const handleHomeClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const isDirty = useEditorStore.getState().isDirty;
      if (isDirty) {
        setShowUnsavedDialog(true);
      } else {
        router.push(homePath);
      }
    },
    [router, homePath],
  );

  const handleSaveAndLeave = useCallback(async () => {
    setIsSavingAndLeaving(true);
    try {
      const { flow } = useEditorStore.getState();
      if (flow) {
        const res = await fetch(`/api/flows/${flowId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ definition: flow }),
        });
        if (res.ok) {
          useEditorStore.getState().markSaved();
        }
      }
      router.push(homePath);
    } catch {
      setIsSavingAndLeaving(false);
    }
  }, [flowId, router, homePath]);

  const handleLeaveWithoutSaving = useCallback(() => {
    useEditorStore.getState().markSaved();
    setShowUnsavedDialog(false);
    router.push(homePath);
  }, [router, homePath]);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/flows/${flowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPublishError(data.error ?? "Fehler beim Veröffentlichen");
      } else {
        router.refresh();
      }
    } catch {
      setPublishError("Fehler beim Veröffentlichen");
    } finally {
      setIsPublishing(false);
    }
  }, [flowId, router]);

  const handleSubmitForReview = useCallback(async () => {
    try {
      await fetch(`/api/flows/${flowId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
    } catch {
      // silent fail
    }
  }, [flowId]);

  return (
    <>
      <nav className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 relative">
        {/* Left: Home + Tabs */}
        <div className="flex items-center gap-1 h-full">
          {/* Home button */}
          <a
            href={homePath}
            onClick={handleHomeClick}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors mr-2"
            title="Home"
          >
            <Home size={18} />
          </a>

          {/* Tabs */}
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`relative flex items-center h-full px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-[#4C5FD5]"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4C5FD5]" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Center: Flow name */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center text-sm font-semibold text-gray-900 truncate max-w-64 pointer-events-none">
          <span>{flowName}</span>
          {reviewStatus && reviewStatus !== "none" && (
            <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${
              reviewStatus === "in_review" ? "bg-amber-50 text-amber-700 border-amber-200" :
              reviewStatus === "approved" ? "bg-green-50 text-green-700 border-green-200" :
              "bg-red-50 text-red-700 border-red-200"
            }`}>
              {reviewStatus === "in_review" ? "In Review" : reviewStatus === "approved" ? "Freigegeben" : "Abgelehnt"}
            </div>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          {/* AI Generate */}
          <button
            onClick={() => setShowAIGenerate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Flow mit AI generieren"
          >
            <Sparkles size={14} className="text-purple-500" />
            AI
          </button>

          {/* Comments */}
          <button
            onClick={() => setShowComments((v) => !v)}
            className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
              showComments ? "text-indigo-600 bg-indigo-50" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
            title="Kommentare"
          >
            <MessageSquare size={16} />
          </button>

          {/* Submit for Review */}
          {(!reviewStatus || reviewStatus === "none" || reviewStatus === "rejected") && (
            <button
              onClick={handleSubmitForReview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <GitPullRequest size={14} />
              Review
            </button>
          )}

          {/* More menu */}
          <button
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            title="Mehr"
          >
            <MoreHorizontal size={18} />
          </button>

          {/* A/B Test */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors">
            <FlaskConical size={14} />
            A/B Test
          </button>

          {/* People */}
          <button
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            title="Personen"
          >
            <Users size={14} />
          </button>

          {/* Settings gear */}
          <Link
            href={`${basePath}/settings`}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            title="Einstellungen"
          >
            <Settings size={14} />
          </Link>

          {/* Vorschau */}
          <a
            href={`/embed/${flowSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Eye size={14} />
            Vorschau
          </a>

          {/* Publish CTA */}
          <div className="flex flex-col items-end gap-0.5">
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="flex items-center px-4 py-1.5 rounded-lg bg-[#4C5FD5] text-white text-xs font-semibold hover:bg-[#3d4fc0] transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPublishing ? "Veröffentlicht..." : "Veröffentlichen"}
            </button>
            {publishError && (
              <p className="text-[10px] text-red-500 max-w-[160px] text-right leading-tight">
                {publishError}
              </p>
            )}
          </div>
        </div>
      </nav>

      {showComments && (
        <CommentsPanel
          flowId={flowId}
          onClose={() => setShowComments(false)}
        />
      )}
      {showAIGenerate && (
        <AIGenerateDialog
          onClose={() => setShowAIGenerate(false)}
          locale={locale}
        />
      )}

      {/* Unsaved changes dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowUnsavedDialog(false)}
          />
          {/* Card */}
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Ungespeicherte Änderungen
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Du hast ungespeicherte Änderungen. Möchtest du sie speichern?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUnsavedDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleLeaveWithoutSaving}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Ohne Speichern verlassen
              </button>
              <button
                type="button"
                onClick={handleSaveAndLeave}
                disabled={isSavingAndLeaving}
                className="px-4 py-2 rounded-lg bg-[#4C5FD5] text-white text-sm font-semibold hover:bg-[#3d4fc0] transition-colors disabled:opacity-50"
              >
                {isSavingAndLeaving ? "Speichern..." : "Speichern & Verlassen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
