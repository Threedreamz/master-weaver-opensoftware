// Core
export { BaseIntegrationClient, IntegrationError } from "./core/base-client.js";
export type { IntegrationErrorCode } from "./core/base-client.js";
export { OAuthManager } from "./core/oauth-manager.js";
export type { OAuthTokens, OAuthConfig } from "./core/oauth-manager.js";
export { verifyWebhookSignature, verifyStripeSignature } from "./core/webhook-verifier.js";
export { encryptCredentials, decryptCredentials } from "./core/credential-store.js";
export type * from "./core/types.js";

// Registry
export {
  INTEGRATION_REGISTRY,
  getIntegrationsForApp,
  getIntegrationsByCategory,
  getIntegration,
  getAllIntegrationIds,
  getIntegrationCountByApp,
} from "./registry/index.js";
export type { IntegrationId } from "./registry/index.js";
