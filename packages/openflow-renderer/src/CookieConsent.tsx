"use client";

import React, { useEffect, useState } from "react";

const STORAGE_KEY = "openflow_cookie_consent";

export interface CookieConsentProps {
  text?: string;
  acceptLabel?: string;
  declineLabel?: string;
  primaryColor?: string;
}

export function CookieConsent({
  text = "Diese Website verwendet Cookies, um Ihnen die bestmögliche Erfahrung zu bieten.",
  acceptLabel = "Akzeptieren",
  declineLabel = "Ablehnen",
  primaryColor = "#6366f1",
}: CookieConsentProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  function handleDecline() {
    try {
      localStorage.setItem(STORAGE_KEY, "declined");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="cookie-consent-banner"
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 2rem)",
        maxWidth: "680px",
        zIndex: 9999,
        background: "#fff",
        borderRadius: "0.75rem",
        boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.15), 0 4px 6px -2px rgb(0 0 0 / 0.1)",
        padding: "1rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      <p
        style={{
          flex: "1 1 auto",
          margin: 0,
          fontSize: "0.875rem",
          color: "#374151",
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleDecline}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.8125rem",
            fontWeight: 500,
            borderRadius: "0.5rem",
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#374151",
            cursor: "pointer",
          }}
        >
          {declineLabel}
        </button>
        <button
          type="button"
          onClick={handleAccept}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.8125rem",
            fontWeight: 500,
            borderRadius: "0.5rem",
            border: "none",
            background: primaryColor,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {acceptLabel}
        </button>
      </div>
    </div>
  );
}
