import { extractedTaskSchema, type ExtractedTask } from "@opensoftware/openportal-core";

export interface TaskExtractor {
  readonly name: string;
  extract(input: {
    transcript: string;
    knownMemberEmails?: string[];
  }): Promise<ExtractedTask[]>;
}

const SYSTEM_PROMPT = `You read meeting transcripts and output a JSON array of task objects.
Each task MUST match this TypeScript type:
  { assignee: string | null (email if clear, otherwise null),
    title: string (imperative, short),
    deadline: string | null (ISO 8601 if clear, otherwise null),
    priority: "low" | "normal" | "high" | "urgent" (default "normal") }
Output valid JSON only, no commentary.`;

export class OpenAITaskExtractor implements TaskExtractor {
  readonly name = "openai-chat";

  constructor(
    private opts: {
      apiKey: string;
      baseUrl?: string;
      model?: string;
      fetchImpl?: typeof fetch;
    },
  ) {}

  async extract(input: {
    transcript: string;
    knownMemberEmails?: string[];
  }): Promise<ExtractedTask[]> {
    const fetchImpl = this.opts.fetchImpl ?? fetch;
    const baseUrl = this.opts.baseUrl ?? "https://api.openai.com/v1";
    const model = this.opts.model ?? "gpt-4o-mini";

    const userMessage = [
      `Known team member emails: ${(input.knownMemberEmails ?? []).join(", ") || "(none provided)"}`,
      "",
      "Transcript:",
      input.transcript,
    ].join("\n");

    const res = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.opts.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`TaskExtractor error ${res.status}: ${body}`);
    }

    const raw = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = raw.choices?.[0]?.message?.content ?? "[]";
    let parsed: unknown;
    try {
      const obj = JSON.parse(content);
      parsed = Array.isArray(obj) ? obj : (obj as { tasks?: unknown }).tasks ?? [];
    } catch {
      parsed = [];
    }

    const arr = Array.isArray(parsed) ? parsed : [];
    return arr
      .map((t) => {
        const r = extractedTaskSchema.safeParse(t);
        return r.success ? r.data : null;
      })
      .filter((t): t is ExtractedTask => t !== null);
  }
}

export function resolveTaskExtractor(env = process.env): TaskExtractor {
  return new OpenAITaskExtractor({
    apiKey: env.LLM_API_KEY ?? env.OPENAI_API_KEY ?? "",
    model: env.LLM_MODEL,
  });
}
