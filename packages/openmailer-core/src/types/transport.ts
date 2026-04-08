export interface EmailMessage {
  from: { name: string; email: string };
  to: { name?: string; email: string }[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailTransport {
  name: string;
  send(message: EmailMessage): Promise<SendResult>;
  verifyConnection(): Promise<boolean>;
}
