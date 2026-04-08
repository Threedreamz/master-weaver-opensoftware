export { MailchimpClient } from "./client.js";
export {
  verifyMailchimpWebhook,
  parseMailchimpWebhook,
  isMailchimpWebhookEventType,
  handleMailchimpWebhookVerification,
} from "./webhooks.js";
export type { MailchimpWebhookConfig } from "./webhooks.js";
export type {
  MailchimpClientConfig,
  MailchimpList,
  MailchimpListsResponse,
  MailchimpMember,
  MailchimpMemberStatus,
  MailchimpMembersResponse,
  MailchimpCreateMemberInput,
  MailchimpUpdateMemberInput,
  MailchimpCampaign,
  MailchimpCampaignType,
  MailchimpCampaignStatus,
  MailchimpCampaignsResponse,
  MailchimpCreateCampaignInput,
  MailchimpUpdateCampaignInput,
  MailchimpCampaignContent,
  MailchimpSetCampaignContentInput,
  MailchimpTemplate,
  MailchimpTemplatesResponse,
  MailchimpCreateTemplateInput,
  MailchimpCampaignReport,
  MailchimpReportsResponse,
  MailchimpWebhookEvent,
  MailchimpWebhookEventType,
  MailchimpPaginationParams,
} from "./types.js";
