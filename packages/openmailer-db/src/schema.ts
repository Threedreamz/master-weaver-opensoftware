import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Workspaces --------------------------------------------------------------

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  settings: jsonb("settings").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  workspaceMembers: many(workspaceMembers),
  contacts: many(contacts),
  tags: many(tags),
  segments: many(segments),
  emailTemplates: many(emailTemplates),
  campaigns: many(campaigns),
  forms: many(forms),
  automations: many(automations),
  trackingEvents: many(trackingEvents),
  emailTransports: many(emailTransports),
  emailWhitelist: many(emailWhitelist),
  auditLogs: many(auditLogs),
}));

// --- Workspace Members (replaces users) --------------------------------------

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  externalUserId: varchar("external_user_id", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  role: varchar("role", { length: 20 }).default("admin").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
  })
);

// --- Contacts ----------------------------------------------------------------

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    email: varchar("email", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    customFields: jsonb("custom_fields").default({}).notNull(),
    score: integer("score").default(0).notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    emailConsent: boolean("email_consent").default(false).notNull(),
    trackingConsent: boolean("tracking_consent").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("contacts_workspace_email_idx").on(
      table.workspaceId,
      table.email
    ),
  ]
);

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [contacts.workspaceId],
    references: [workspaces.id],
  }),
  contactTags: many(contactTags),
  segmentContacts: many(segmentContacts),
  campaignEvents: many(campaignEvents),
  automationEnrollments: many(automationEnrollments),
}));

// --- Tags --------------------------------------------------------------------

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tagsRelations = relations(tags, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [tags.workspaceId],
    references: [workspaces.id],
  }),
  contactTags: many(contactTags),
}));

// --- Contact Tags (join table) -----------------------------------------------

export const contactTags = pgTable(
  "contact_tags",
  {
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (table) => [primaryKey({ columns: [table.contactId, table.tagId] })]
);

export const contactTagsRelations = relations(contactTags, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactTags.contactId],
    references: [contacts.id],
  }),
  tag: one(tags, {
    fields: [contactTags.tagId],
    references: [tags.id],
  }),
}));

// --- Segments ----------------------------------------------------------------

export const segments = pgTable("segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: varchar("name", { length: 255 }).notNull(),
  conditions: jsonb("conditions").default([]).notNull(),
  conditionLogic: varchar("condition_logic", { length: 10 })
    .default("and")
    .notNull(),
  isDynamic: boolean("is_dynamic").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const segmentsRelations = relations(segments, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [segments.workspaceId],
    references: [workspaces.id],
  }),
  segmentContacts: many(segmentContacts),
  campaigns: many(campaigns),
}));

// --- Segment Contacts (join table) -------------------------------------------

export const segmentContacts = pgTable(
  "segment_contacts",
  {
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => segments.id),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
  },
  (table) => [primaryKey({ columns: [table.segmentId, table.contactId] })]
);

export const segmentContactsRelations = relations(
  segmentContacts,
  ({ one }) => ({
    segment: one(segments, {
      fields: [segmentContacts.segmentId],
      references: [segments.id],
    }),
    contact: one(contacts, {
      fields: [segmentContacts.contactId],
      references: [contacts.id],
    }),
  })
);

// --- Email Templates ---------------------------------------------------------

export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlBody: text("html_body").notNull(),
  jsonBody: jsonb("json_body"),
  category: varchar("category", { length: 50 }).default("other").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailTemplatesRelations = relations(
  emailTemplates,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [emailTemplates.workspaceId],
      references: [workspaces.id],
    }),
    campaigns: many(campaigns),
  })
);

// --- Campaigns ---------------------------------------------------------------

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).default("regular").notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  templateId: uuid("template_id").references(() => emailTemplates.id),
  segmentId: uuid("segment_id").references(() => segments.id),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  fromName: varchar("from_name", { length: 255 }).notNull(),
  fromEmail: varchar("from_email", { length: 255 }).notNull(),
  replyTo: varchar("reply_to", { length: 255 }),
  subject: varchar("subject", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [campaigns.workspaceId],
    references: [workspaces.id],
  }),
  template: one(emailTemplates, {
    fields: [campaigns.templateId],
    references: [emailTemplates.id],
  }),
  segment: one(segments, {
    fields: [campaigns.segmentId],
    references: [segments.id],
  }),
  campaignEvents: many(campaignEvents),
}));

// --- Campaign Events ---------------------------------------------------------

export const campaignEvents = pgTable("campaign_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id),
  type: varchar("type", { length: 20 }).notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const campaignEventsRelations = relations(
  campaignEvents,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignEvents.campaignId],
      references: [campaigns.id],
    }),
    contact: one(contacts, {
      fields: [campaignEvents.contactId],
      references: [contacts.id],
    }),
  })
);

// --- Forms -------------------------------------------------------------------

export const forms = pgTable("forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: varchar("name", { length: 255 }).notNull(),
  fields: jsonb("fields").default([]).notNull(),
  settings: jsonb("settings").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const formsRelations = relations(forms, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [forms.workspaceId],
    references: [workspaces.id],
  }),
  formSubmissions: many(formSubmissions),
}));

// --- Form Submissions --------------------------------------------------------

export const formSubmissions = pgTable("form_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id")
    .notNull()
    .references(() => forms.id),
  contactId: uuid("contact_id").references(() => contacts.id),
  data: jsonb("data").default({}).notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const formSubmissionsRelations = relations(
  formSubmissions,
  ({ one }) => ({
    form: one(forms, {
      fields: [formSubmissions.formId],
      references: [forms.id],
    }),
    contact: one(contacts, {
      fields: [formSubmissions.contactId],
      references: [contacts.id],
    }),
  })
);

// --- Automations -------------------------------------------------------------

export const automations = pgTable("automations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  triggerType: varchar("trigger_type", { length: 50 }).notNull(),
  triggerConfig: jsonb("trigger_config").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const automationsRelations = relations(
  automations,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [automations.workspaceId],
      references: [workspaces.id],
    }),
    automationSteps: many(automationSteps),
    automationEnrollments: many(automationEnrollments),
  })
);

// --- Automation Steps --------------------------------------------------------

export const automationSteps = pgTable("automation_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  automationId: uuid("automation_id")
    .notNull()
    .references(() => automations.id),
  type: varchar("type", { length: 50 }).notNull(),
  config: jsonb("config").default({}).notNull(),
  positionX: integer("position_x").default(0).notNull(),
  positionY: integer("position_y").default(0).notNull(),
  parentStepId: uuid("parent_step_id").references(
    (): any => automationSteps.id
  ),
  branch: varchar("branch", { length: 20 }).default("default").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const automationStepsRelations = relations(
  automationSteps,
  ({ one, many }) => ({
    automation: one(automations, {
      fields: [automationSteps.automationId],
      references: [automations.id],
    }),
    parentStep: one(automationSteps, {
      fields: [automationSteps.parentStepId],
      references: [automationSteps.id],
      relationName: "stepParent",
    }),
    childSteps: many(automationSteps, { relationName: "stepParent" }),
    enrollments: many(automationEnrollments),
  })
);

// --- Automation Enrollments --------------------------------------------------

export const automationEnrollments = pgTable("automation_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  automationId: uuid("automation_id")
    .notNull()
    .references(() => automations.id),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id),
  currentStepId: uuid("current_step_id").references(() => automationSteps.id),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
});

export const automationEnrollmentsRelations = relations(
  automationEnrollments,
  ({ one }) => ({
    automation: one(automations, {
      fields: [automationEnrollments.automationId],
      references: [automations.id],
    }),
    contact: one(contacts, {
      fields: [automationEnrollments.contactId],
      references: [contacts.id],
    }),
    currentStep: one(automationSteps, {
      fields: [automationEnrollments.currentStepId],
      references: [automationSteps.id],
    }),
  })
);

// --- Tracking Events ---------------------------------------------------------

export const trackingEvents = pgTable("tracking_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  contactId: uuid("contact_id").references(() => contacts.id),
  anonymousId: varchar("anonymous_id", { length: 255 }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  url: text("url"),
  referrer: text("referrer"),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const trackingEventsRelations = relations(
  trackingEvents,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [trackingEvents.workspaceId],
      references: [workspaces.id],
    }),
    contact: one(contacts, {
      fields: [trackingEvents.contactId],
      references: [contacts.id],
    }),
  })
);

// --- Email Transports --------------------------------------------------------

export const emailTransports = pgTable("email_transports", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  config: jsonb("config").default({}).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailTransportsRelations = relations(
  emailTransports,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [emailTransports.workspaceId],
      references: [workspaces.id],
    }),
  })
);

// --- Email Whitelist ---------------------------------------------------------

export const emailWhitelist = pgTable(
  "email_whitelist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    email: varchar("email", { length: 255 }),
    domain: varchar("domain", { length: 255 }),
    source: varchar("source", { length: 50 }).default("manual").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export const emailWhitelistRelations = relations(emailWhitelist, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [emailWhitelist.workspaceId],
    references: [workspaces.id],
  }),
}));

// --- Audit Logs --------------------------------------------------------------

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  memberId: uuid("member_id").references(() => workspaceMembers.id),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }).notNull(),
  details: jsonb("details").default({}).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [auditLogs.workspaceId],
    references: [workspaces.id],
  }),
  member: one(workspaceMembers, {
    fields: [auditLogs.memberId],
    references: [workspaceMembers.id],
  }),
}));

// --- Type Exports ------------------------------------------------------------

export type EmailWhitelistEntry = typeof emailWhitelist.$inferSelect;
export type NewEmailWhitelistEntry = typeof emailWhitelist.$inferInsert;
