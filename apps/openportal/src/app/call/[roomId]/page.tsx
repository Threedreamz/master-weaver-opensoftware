"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

type BgMode = "none" | "blur" | "image";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: Record<string, unknown>,
    ) => JitsiApi;
  }
}

interface JitsiApi {
  executeCommand: (cmd: string, ...args: unknown[]) => void;
  dispose: () => void;
  addEventListener: (ev: string, handler: (...args: unknown[]) => void) => void;
}

// Jitsi server. Default: framatalk.org (Framasoft NGO, no moderator-auth
// policy as of last check — verified reachable by curl probe).
// Override via NEXT_PUBLIC_JITSI_BASE_URL env var (build-time only, requires
// rebuild on Railway after change). Examples:
//   https://meet.jit.si       — biggest server, REQUIRES Google/etc. login as moderator
//   https://framatalk.org     — Framasoft NGO (FR), reachable, no moderator login (verified 2026-04)
//   https://meet.guifi.net    — Guifi.net Spanish community (less battle-tested)
// (meet.calyx.net is dead as of 2026-04 — DNS does not resolve.)
const JITSI_BASE_URL = (
  process.env.NEXT_PUBLIC_JITSI_BASE_URL ?? "https://framatalk.org"
).replace(/\/$/, "");
const JITSI_DOMAIN = JITSI_BASE_URL.replace(/^https?:\/\//, "");
const JITSI_API_SRC = `${JITSI_BASE_URL}/external_api.js`;

let scriptPromise: Promise<void> | null = null;
function loadJitsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = JITSI_API_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error(`Failed to load ${JITSI_API_SRC}`));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export default function CallPage() {
  const params = useParams<{ roomId: string }>();
  const { data: session } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copied, setCopied] = useState(false);
  const [bgMode, setBgMode] = useState<BgMode>("none");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [ready, setReady] = useState(false);

  const safeRoom = (params?.roomId ?? "").replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80);
  const roomName = `openportal-${safeRoom}`;

  // Capture session at mount-time so signing in/out mid-call doesn't
  // re-instantiate the iframe (which would drop everyone from the call).
  const userInfoRef = useRef<{ displayName?: string; email?: string } | null>(null);
  if (userInfoRef.current === null && session?.user) {
    userInfoRef.current = {
      displayName: session.user.name ?? undefined,
      email: session.user.email ?? undefined,
    };
  }

  // Mount Jitsi External API once per room
  useEffect(() => {
    let cancelled = false;
    let api: JitsiApi | null = null;

    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
        setScriptLoaded(true);
        api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: userInfoRef.current ?? undefined,
          configOverwrite: {
            prejoinPageEnabled: true,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
          },
        });
        apiRef.current = api;
        api.addEventListener("videoConferenceJoined", () => setReady(true));
      })
      .catch((e: Error) => setError(e.message));

    return () => {
      cancelled = true;
      try {
        apiRef.current?.dispose();
      } catch {
        // ignore
      }
      apiRef.current = null;
      setReady(false);
      setScriptLoaded(false);
    };
  }, [roomName]);

  // Apply virtual background whenever mode/image changes (after join)
  useEffect(() => {
    const api = apiRef.current;
    if (!api || !ready) return;
    if (bgMode === "none") {
      api.executeCommand("setVirtualBackground", { enabled: false });
    } else if (bgMode === "blur") {
      api.executeCommand("setVirtualBackground", {
        enabled: true,
        backgroundType: "blur",
        blurValue: 25,
      });
    } else if (bgMode === "image" && bgImage) {
      api.executeCommand("setVirtualBackground", {
        enabled: true,
        backgroundType: "image",
        url: bgImage,
      });
    }
  }, [bgMode, bgImage, ready]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — silent
    }
  }, []);

  const onPickPhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBgImage(typeof reader.result === "string" ? reader.result : null);
      setBgMode("image");
      setError(null);
    };
    reader.onerror = () => setError("Could not read image file.");
    reader.readAsDataURL(file);
  }, []);

  const onModeChange = useCallback((next: BgMode) => {
    setBgMode(next);
    if (next === "image" && !bgImage) {
      fileInputRef.current?.click();
    }
  }, [bgImage]);

  return (
    <main className="flex h-screen flex-col bg-[#09090b]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#27272a] bg-[#18181b] px-4 py-2.5 text-sm text-zinc-200">
        <div className="flex items-baseline gap-3">
          <span className="font-medium text-zinc-100">OpenPortal</span>
          <code className="font-mono text-xs text-zinc-500">{roomName}</code>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-2">
            <span className="text-zinc-500">Background</span>
            <select
              value={bgMode}
              onChange={(e) => onModeChange(e.target.value as BgMode)}
              disabled={!ready}
              className="rounded-md border border-[#3f3f46] bg-[#27272a] px-2 py-1 text-zinc-200 transition-colors hover:border-[#52525b] focus:border-[var(--color-brand)] focus:outline-none disabled:opacity-40"
            >
              <option value="none">None</option>
              <option value="blur">Blur</option>
              <option value="image">Custom photo…</option>
            </select>
            {bgMode === "image" && bgImage ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-[#3f3f46] px-2 py-1 text-zinc-300 transition-colors hover:border-[#52525b] hover:text-zinc-100"
                title="Change photo"
              >
                Change
              </button>
            ) : null}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPickPhoto}
            className="hidden"
          />
          <button
            type="button"
            onClick={copyLink}
            className="rounded-md border border-[#3f3f46] px-2.5 py-1 text-zinc-300 transition-colors hover:border-[#52525b] hover:text-zinc-100"
          >
            {copied ? "Copied" : "Copy invite link"}
          </button>
          <Link
            href="/call"
            className="rounded-md px-2 py-1 text-zinc-400 transition-colors hover:text-zinc-200"
          >
            Leave
          </Link>
        </div>
      </header>

      {error ? (
        <div className="border-b border-red-900/40 bg-red-950 px-4 py-2 text-xs text-red-200">
          {error}
        </div>
      ) : !scriptLoaded ? (
        <div className="border-b border-[#27272a] bg-[#18181b] px-4 py-1.5 text-xs text-zinc-500">
          Loading…
        </div>
      ) : !ready ? (
        <div className="border-b border-[#27272a] bg-[#18181b] px-4 py-1.5 text-xs text-zinc-500">
          Background controls activate once you join.
        </div>
      ) : null}

      <div ref={containerRef} className="min-h-0 flex-1" />
    </main>
  );
}
