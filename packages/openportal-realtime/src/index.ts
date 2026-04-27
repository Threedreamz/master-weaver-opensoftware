export * from "./server.js";
export * from "./client.js";

export type RealtimeEvent =
  | { type: "message.new"; channelId: string; messageId: string; authorId: string }
  | { type: "typing.start"; channelId: string; userId: string }
  | { type: "typing.stop"; channelId: string; userId: string }
  | { type: "meeting.started"; meetingId: string; orgId: string }
  | { type: "meeting.ended"; meetingId: string; orgId: string };
