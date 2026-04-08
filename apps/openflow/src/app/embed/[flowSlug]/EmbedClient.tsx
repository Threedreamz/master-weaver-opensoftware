"use client";

import React from "react";
import { FlowRenderer } from "@opensoftware/openflow-renderer";

interface EmbedClientProps {
  flowSlug: string;
}

export function EmbedClient({ flowSlug }: EmbedClientProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "720px" }}>
        <FlowRenderer
          apiUrl={`/api/public/flows/${flowSlug}`}
          submissionApiUrl="/api/public/submissions"
        />
      </div>
    </div>
  );
}
