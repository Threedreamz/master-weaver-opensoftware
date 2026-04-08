"use client";

import React from "react";

export interface FlowHeaderProps {
  logoUrl?: string;
  title?: string;
  backgroundColor?: string;
}

export function FlowHeader({
  logoUrl,
  title,
  backgroundColor = "#ffffff",
}: FlowHeaderProps) {
  return (
    <div
      className="flow-header"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        height: "52px",
        padding: "0 1.5rem",
        backgroundColor,
        borderBottom: "1px solid #e5e7eb",
        borderTopLeftRadius: "inherit",
        borderTopRightRadius: "inherit",
        flexShrink: 0,
      }}
    >
      {logoUrl && (
        <img
          src={logoUrl}
          alt={title || "Logo"}
          style={{
            height: "28px",
            width: "auto",
            objectFit: "contain",
          }}
        />
      )}
      {title && (
        <span
          style={{
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "#111827",
            lineHeight: 1.2,
          }}
        >
          {title}
        </span>
      )}
    </div>
  );
}
