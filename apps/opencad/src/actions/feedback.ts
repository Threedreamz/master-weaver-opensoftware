"use server";

import { forwardFeedbackToDevtools } from "@opensoftware/ui";

/**
 * Server action: submit admin-panel feedback for opencad.
 * Storage is devtools-manager only — no local table.
 * Throws if the forward env vars are missing (fail loudly for admin panels).
 */
export async function submitFeedback(payload: {
  body: string;
  title: string;
  url: string;
}): Promise<void> {
  const devtoolsUrl = process.env.DEVTOOLS_API_URL;
  const devtoolsToken = process.env.DEVTOOLS_SERVICE_TOKEN;

  if (!devtoolsUrl || !devtoolsToken) {
    throw new Error(
      "opencad feedback: DEVTOOLS_API_URL or DEVTOOLS_SERVICE_TOKEN is not set. " +
        "Run wire-infra-to-bubbles.cjs to provision env vars.",
    );
  }

  forwardFeedbackToDevtools({
    bubble: "3dreamz",
    app: "opencad",
    title: payload.title || null,
    body: payload.body,
    url: payload.url || null,
    priority: "normal",
  });
}
