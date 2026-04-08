"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, StatusBadge } from "@opensoftware/ui";
import { SessionGuard } from "@/components/auth/SessionGuard";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  UserCheck,
  MessageSquare,
  ChevronRight,
  Send,
  Plus,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WorkflowStage = "draft" | "review" | "approved" | "signed" | "archived";

interface Reviewer {
  id: string;
  name: string;
  role: string;
  status: "pending" | "approved" | "rejected";
  comment: string | null;
  timestamp: string | null;
}

interface HistoryEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details: string;
}

interface Comment {
  id: string;
  stage: WorkflowStage;
  author: string;
  text: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const STAGES: WorkflowStage[] = ["draft", "review", "approved", "signed", "archived"];

const STAGE_LABELS: Record<WorkflowStage, string> = {
  draft: "Draft",
  review: "In Review",
  approved: "Approved",
  signed: "Signed",
  archived: "Archived",
};

const MOCK_REVIEWERS: Reviewer[] = [
  { id: "r-1", name: "Sarah Mueller", role: "Legal Counsel", status: "approved", comment: "Looks good. Minor formatting suggestions applied.", timestamp: "2026-03-12 14:30" },
  { id: "r-2", name: "Thomas Weber", role: "Compliance Officer", status: "approved", comment: "GDPR clauses verified.", timestamp: "2026-03-13 09:15" },
  { id: "r-3", name: "Lisa Schmidt", role: "Department Head", status: "pending", comment: null, timestamp: null },
];

const MOCK_HISTORY: HistoryEntry[] = [
  { id: "h-1", action: "Document created", actor: "Anna Frank", timestamp: "2026-03-10 10:00", details: "Initial draft uploaded" },
  { id: "h-2", action: "Sent for review", actor: "Anna Frank", timestamp: "2026-03-11 15:30", details: "Assigned to Legal Counsel and Compliance" },
  { id: "h-3", action: "Review approved", actor: "Sarah Mueller", timestamp: "2026-03-12 14:30", details: "Legal Counsel approved with minor changes" },
  { id: "h-4", action: "Review approved", actor: "Thomas Weber", timestamp: "2026-03-13 09:15", details: "Compliance Officer approved" },
];

const MOCK_COMMENTS: Comment[] = [
  { id: "c-1", stage: "draft", author: "Anna Frank", text: "Initial version based on the Q1 template. Please review section 3 carefully.", timestamp: "2026-03-10 10:05" },
  { id: "c-2", stage: "review", author: "Sarah Mueller", text: "Section 3.2 needs a liability cap. I have added a suggestion.", timestamp: "2026-03-12 14:25" },
  { id: "c-3", stage: "review", author: "Thomas Weber", text: "Data processing addendum looks compliant. Approved.", timestamp: "2026-03-13 09:10" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WorkflowPage() {
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const router = useRouter();

  const [currentStage] = useState<WorkflowStage>("review");
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState(MOCK_COMMENTS);

  const currentStageIndex = STAGES.indexOf(currentStage);

  const handleAddComment = useCallback(() => {
    if (!newComment.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        stage: currentStage,
        author: "You",
        text: newComment.trim(),
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
      },
    ]);
    setNewComment("");
  }, [newComment, currentStage]);

  const stageComments = comments.filter((c) => c.stage === currentStage);

  return (
    <SessionGuard requiredRole="viewer">
      <PageHeader
        title="Document Workflow"
        description={`Tracking lifecycle for document ${id}`}
        actions={
          <button
            onClick={() => router.push(`/${locale}/legal/documents`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to Documents
          </button>
        }
      />

      {/* Status pipeline */}
      <div className="mb-8">
        <nav aria-label="Workflow stages">
          <ol className="flex items-center gap-0">
            {STAGES.map((stage, idx) => {
              const isCompleted = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isFuture = idx > currentStageIndex;
              return (
                <li key={stage} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isCurrent
                          ? "bg-blue-500 text-white ring-4 ring-blue-200 dark:ring-blue-900/50"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        isCompleted
                          ? "text-green-600 dark:text-green-400"
                          : isCurrent
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {STAGE_LABELS[stage]}
                    </span>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-1 ${
                        idx < currentStageIndex
                          ? "bg-green-400 dark:bg-green-600"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Reviewers + Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reviewers */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-gray-500" aria-hidden="true" />
              Reviewers
            </h2>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
              {MOCK_REVIEWERS.map((reviewer) => (
                <div key={reviewer.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        reviewer.status === "approved"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : reviewer.status === "rejected"
                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {reviewer.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{reviewer.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{reviewer.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={reviewer.status} />
                    {reviewer.timestamp && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{reviewer.timestamp}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Comments for current stage */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-500" aria-hidden="true" />
              Comments &mdash; {STAGE_LABELS[currentStage]}
            </h2>
            <div className="space-y-3 mb-4">
              {stageComments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  No comments for this stage yet.
                </p>
              ) : (
                stageComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {comment.author}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {comment.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{comment.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add comment */}
            <div className="flex items-start gap-2">
              <label htmlFor="workflow-comment" className="sr-only">Add a comment</label>
              <textarea
                id="workflow-comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                placeholder="Add a comment..."
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                Send
              </button>
            </div>
          </section>
        </div>

        {/* Right: History log */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" aria-hidden="true" />
            History
          </h2>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <ol className="relative border-l-2 border-gray-200 dark:border-gray-700 space-y-6 ml-2">
              {MOCK_HISTORY.map((entry) => (
                <li key={entry.id} className="pl-6 relative">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.action}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {entry.actor} &middot; {entry.timestamp}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{entry.details}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </SessionGuard>
  );
}
