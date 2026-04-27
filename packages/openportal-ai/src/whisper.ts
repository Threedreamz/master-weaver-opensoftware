export interface WhisperProvider {
  readonly name: string;
  transcribe(input: { audioUrl: string; language?: string }): Promise<TranscriptionResult>;
}

export interface TranscriptionResult {
  fullText: string;
  segments: TranscriptSegment[];
  provider: string;
  language?: string;
}

export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string | null;
}

export class OpenAIWhisperProvider implements WhisperProvider {
  readonly name = "openai-whisper";

  constructor(
    private opts: {
      apiKey: string;
      baseUrl?: string;
      model?: string;
      fetchImpl?: typeof fetch;
    },
  ) {}

  async transcribe(input: { audioUrl: string; language?: string }): Promise<TranscriptionResult> {
    const fetchImpl = this.opts.fetchImpl ?? fetch;
    const baseUrl = this.opts.baseUrl ?? "https://api.openai.com/v1";
    const model = this.opts.model ?? "whisper-1";

    const audioRes = await fetchImpl(input.audioUrl);
    if (!audioRes.ok) {
      throw new Error(`Failed to fetch audio: ${audioRes.status}`);
    }
    const audioBlob = await audioRes.blob();

    const form = new FormData();
    form.append("file", audioBlob, "meeting.webm");
    form.append("model", model);
    form.append("response_format", "verbose_json");
    if (input.language) form.append("language", input.language);

    const res = await fetchImpl(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.opts.apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Whisper API error ${res.status}: ${body}`);
    }

    const raw = (await res.json()) as {
      text: string;
      language?: string;
      segments?: Array<{ start: number; end: number; text: string }>;
    };

    return {
      provider: this.name,
      language: raw.language,
      fullText: raw.text,
      segments: (raw.segments ?? []).map((s) => ({
        startMs: Math.round(s.start * 1000),
        endMs: Math.round(s.end * 1000),
        text: s.text.trim(),
      })),
    };
  }
}

export function resolveWhisperProvider(env = process.env): WhisperProvider {
  const providerName = env.WHISPER_PROVIDER ?? "openai";
  switch (providerName) {
    case "openai":
      return new OpenAIWhisperProvider({
        apiKey: env.WHISPER_API_KEY ?? env.OPENAI_API_KEY ?? "",
      });
    default:
      throw new Error(`Unknown WHISPER_PROVIDER: ${providerName}`);
  }
}
