"use client";

import React from "react";

export interface FlowFooterProps {
  text?: string;
  links?: Array<{ label: string; url: string }>;
  backgroundColor?: string;
}

export function FlowFooter({
  text,
  links,
  backgroundColor = "#f9fafb",
}: FlowFooterProps) {
  return (
    <div
      className="flow-footer"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        flexWrap: "wrap",
        padding: "0.75rem 1.5rem",
        backgroundColor,
        borderTop: "1px solid #e5e7eb",
        borderBottomLeftRadius: "inherit",
        borderBottomRightRadius: "inherit",
        flexShrink: 0,
      }}
    >
      {text && (
        <span
          style={{
            fontSize: "0.75rem",
            color: "#6b7280",
          }}
        >
          {text}
        </span>
      )}
      {links && links.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
