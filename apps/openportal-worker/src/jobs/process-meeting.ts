import type { Job } from "bullmq";
import { resolveWhisperProvider, resolveTaskExtractor } from "@opensoftware/openportal-ai";
import { sendOpenPipelineWebhook } from "../services/openpipeline.js";

export interface ProcessMeetingJobData {
  meetingId: string;
  orgId: string;
  workspaceId: string;
  audioUrl: string;
  language?: string;
  knownMemberEmails?: string[];
}

export async function processMeeting(job: Job<ProcessMeetingJobData>) {
  const { data } = job;

  const whisper = resolveWhisperProvider();
  const extractor = resolveTaskExtractor();

  const transcription = await whisper.transcribe({
    audioUrl: data.audioUrl,
    language: data.language,
  });

  const tasks = await extractor.extract({
    transcript: transcription.fullText,
    knownMemberEmails: data.knownMemberEmails,
  });

  const webhookUrl = process.env.OPENPIPELINE_WEBHOOK_URL;
  const webhookSecret = process.env.OPENPIPELINE_WEBHOOK_SECRET;
  if (webhookUrl && webhookSecret && tasks.length > 0) {
    await sendOpenPipelineWebhook(
      {
        meetingId: data.meetingId,
        orgId: data.orgId,
        workspaceId: data.workspaceId,
        tasks,
        transcriptUrl: null,
        source: "openportal",
      },
      { url: webhookUrl, secret: webhookSecret },
    );
  }

  return { transcriptLength: transcription.fullText.length, taskCount: tasks.length };
}
