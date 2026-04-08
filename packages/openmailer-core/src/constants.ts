export const CONTACT_STATUSES = ['active', 'unsubscribed', 'bounced', 'inactive'] as const;
export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sending', 'sent', 'paused'] as const;
export const CAMPAIGN_TYPES = ['regular', 'automated', 'ab_test'] as const;
export const USER_ROLES = ['admin', 'editor', 'viewer'] as const;
export const TEMPLATE_CATEGORIES = ['newsletter', 'promotion', 'welcome', 'transactional', 'other'] as const;
export const SEGMENT_OPERATORS = ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'is_set', 'is_not_set'] as const;
