CREATE TABLE "admin_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"permission_key" text NOT NULL,
	"granted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"credential_key" text NOT NULL,
	"encrypted_value" text NOT NULL,
	"last_tested_at" timestamp,
	"test_status" text DEFAULT 'untested' NOT NULL,
	"last_error" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gsc_core_web_vitals" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"url" text NOT NULL,
	"form_factor" text DEFAULT 'mobile' NOT NULL,
	"lcp_p75_ms" double precision,
	"inp_p75_ms" double precision,
	"cls_p75" double precision,
	"overall_status" text,
	"measured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gsc_index_coverage" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"url" text NOT NULL,
	"state" text NOT NULL,
	"verdict" text,
	"last_crawled" timestamp,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gsc_query_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"page" text NOT NULL,
	"query" text NOT NULL,
	"device" text DEFAULT 'ALL' NOT NULL,
	"country" text DEFAULT 'ALL' NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"ctr" double precision DEFAULT 0 NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mutation_changeset_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"changeset_id" integer NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"action" text NOT NULL,
	"field_changes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mutation_changesets" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"created_by" text NOT NULL,
	"approved_by" text,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"scope" text DEFAULT 'paid' NOT NULL,
	"deployed_at" timestamp,
	"error_log" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organic_backlink_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"total_backlinks" integer DEFAULT 0 NOT NULL,
	"referring_domains" integer DEFAULT 0 NOT NULL,
	"new_count" integer DEFAULT 0 NOT NULL,
	"lost_count" integer DEFAULT 0 NOT NULL,
	"authority_score" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organic_backlinks" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"source_url" text NOT NULL,
	"target_url" text DEFAULT '' NOT NULL,
	"anchor_text" text DEFAULT '' NOT NULL,
	"domain_authority" integer DEFAULT 0 NOT NULL,
	"page_authority" integer DEFAULT 0 NOT NULL,
	"link_type" text DEFAULT 'follow' NOT NULL,
	"first_seen" timestamp,
	"last_seen" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"source_tld" text DEFAULT '' NOT NULL,
	"toxicity_score" integer DEFAULT 0 NOT NULL,
	"is_disavowed" boolean DEFAULT false NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organic_disavow_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"domain_or_url" text NOT NULL,
	"is_domain" boolean DEFAULT true NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"added_by_user_id" text,
	"exported_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organic_keyword_universe" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"keyword" text NOT NULL,
	"search_volume" integer DEFAULT 0 NOT NULL,
	"difficulty" integer DEFAULT 0 NOT NULL,
	"intent" text DEFAULT '' NOT NULL,
	"cpc" double precision DEFAULT 0 NOT NULL,
	"serp_features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"embedding" jsonb,
	"cluster_id" integer
);
--> statement-breakpoint
CREATE TABLE "organic_masterplan_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"seed_keyword" text NOT NULL,
	"database" text DEFAULT 'de' NOT NULL,
	"keyword_count" integer DEFAULT 0 NOT NULL,
	"cluster_count" integer DEFAULT 0 NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"triggered_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organic_roadmap_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"cluster_id" integer NOT NULL,
	"sprint_id" integer,
	"title" text NOT NULL,
	"type" text DEFAULT 'article' NOT NULL,
	"status" text DEFAULT 'backlog' NOT NULL,
	"start_date" timestamp,
	"due_date" timestamp,
	"owner" text DEFAULT '' NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organic_serp_features" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"keyword" text NOT NULL,
	"database" text DEFAULT 'de' NOT NULL,
	"has_featured_snippet" boolean DEFAULT false NOT NULL,
	"has_paa" boolean DEFAULT false NOT NULL,
	"has_knowledge_panel" boolean DEFAULT false NOT NULL,
	"has_video_carousel" boolean DEFAULT false NOT NULL,
	"has_local_pack" boolean DEFAULT false NOT NULL,
	"owns_feature" text DEFAULT 'none' NOT NULL,
	"opportunity_score" integer DEFAULT 0 NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organic_site_audit_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"issue_code" text NOT NULL,
	"severity" text DEFAULT 'notice' NOT NULL,
	"issue_title" text NOT NULL,
	"affected_page_count" integer DEFAULT 0 NOT NULL,
	"sample_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category" text DEFAULT 'technical' NOT NULL,
	"ticket_id" integer
);
--> statement-breakpoint
CREATE TABLE "organic_site_audit_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"campaign_id" text NOT NULL,
	"snapshot_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_pages" integer DEFAULT 0 NOT NULL,
	"errors_count" integer DEFAULT 0 NOT NULL,
	"warnings_count" integer DEFAULT 0 NOT NULL,
	"notices_count" integer DEFAULT 0 NOT NULL,
	"site_health" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organic_sprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"name" text NOT NULL,
	"theme" text DEFAULT '' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"goal_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organic_topic_clusters" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"label" text NOT NULL,
	"pillar_keyword" text NOT NULL,
	"keyword_count" integer DEFAULT 0 NOT NULL,
	"total_volume" integer DEFAULT 0 NOT NULL,
	"priority_score" integer DEFAULT 0 NOT NULL,
	"suggested_month" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organic_visibility_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"domain" text NOT NULL,
	"is_competitor" boolean DEFAULT false NOT NULL,
	"database" text DEFAULT 'de' NOT NULL,
	"visibility_score" double precision DEFAULT 0 NOT NULL,
	"estimated_traffic" integer DEFAULT 0 NOT NULL,
	"top3_count" integer DEFAULT 0 NOT NULL,
	"top10_count" integer DEFAULT 0 NOT NULL,
	"top20_count" integer DEFAULT 0 NOT NULL,
	"avg_position" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"type" text DEFAULT 'client' NOT NULL,
	"parent_account_id" integer,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"timezone" text DEFAULT 'Europe/Berlin' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_ad_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"type" text DEFAULT 'standard' NOT NULL,
	"cpc_bid" double precision,
	"cpm_bid" double precision,
	"target_cpa" double precision,
	"target_roas" double precision,
	"sync_status" text DEFAULT 'local_only' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_ads" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad_group_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"external_id" text,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"approval_status" text DEFAULT 'pending' NOT NULL,
	"headlines" text,
	"descriptions" text,
	"final_urls" text,
	"path_1" text,
	"path_2" text,
	"display_url" text,
	"disapproval_reasons" text,
	"sync_status" text DEFAULT 'local_only' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"external_id" text,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"metadata" text,
	"status" text DEFAULT 'active' NOT NULL,
	"performance_label" text DEFAULT 'unknown' NOT NULL,
	"sync_status" text DEFAULT 'local_only' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_audiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"member_count" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" text,
	"sync_status" text DEFAULT 'local_only' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"before" text,
	"after" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_budget_pacing" (
	"id" serial PRIMARY KEY NOT NULL,
	"budget_plan_id" integer NOT NULL,
	"date" text NOT NULL,
	"planned_spend" double precision NOT NULL,
	"actual_spend" double precision DEFAULT 0 NOT NULL,
	"cumulative_planned" double precision NOT NULL,
	"cumulative_actual" double precision DEFAULT 0 NOT NULL,
	"velocity" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_budget_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"name" text NOT NULL,
	"month" text NOT NULL,
	"planned_budget" double precision NOT NULL,
	"actual_spend" double precision DEFAULT 0 NOT NULL,
	"forecasted_spend" double precision,
	"status" text DEFAULT 'planned' NOT NULL,
	"adjustment_rules" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"campaign_id" integer,
	"name" text NOT NULL,
	"amount" double precision NOT NULL,
	"period" text DEFAULT 'daily' NOT NULL,
	"delivery_method" text DEFAULT 'standard' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"bidding_strategy" text,
	"daily_budget" double precision,
	"start_date" text,
	"end_date" text,
	"target_locations" text,
	"target_languages" text,
	"ad_schedule" text,
	"labels" text,
	"notes" text,
	"sync_status" text DEFAULT 'local_only' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_conversion_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"source" text DEFAULT 'website' NOT NULL,
	"counting_type" text DEFAULT 'one_per_click' NOT NULL,
	"attribution_model" text DEFAULT 'last_click' NOT NULL,
	"default_value" double precision,
	"is_primary" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"tag_status" text DEFAULT 'unverified' NOT NULL,
	"last_conversion_at" timestamp,
	"sync_status" text DEFAULT 'local_only' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_conversion_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversion_action_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"gclid" text,
	"gbraid" text,
	"wbraid" text,
	"conversion_value" double precision,
	"currency_code" text DEFAULT 'EUR',
	"order_id" text,
	"conversion_date_time" text NOT NULL,
	"upload_status" text DEFAULT 'pending' NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"platform" text NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"scopes" text,
	"metadata" text,
	"last_health_check" timestamp,
	"health_status" text DEFAULT 'healthy' NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_keywords" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad_group_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"external_id" text,
	"keyword" text NOT NULL,
	"match_type" text NOT NULL,
	"status" text DEFAULT 'enabled' NOT NULL,
	"is_negative" boolean DEFAULT false NOT NULL,
	"max_cpc" double precision,
	"quality_score" integer,
	"sync_status" text DEFAULT 'local_only' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_metrics_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"campaign_id" integer,
	"ad_group_id" integer,
	"date" text NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"cost" double precision DEFAULT 0 NOT NULL,
	"conversions" double precision DEFAULT 0 NOT NULL,
	"conversion_value" double precision DEFAULT 0 NOT NULL,
	"ctr" double precision,
	"avg_cpc" double precision,
	"impression_share" double precision,
	"lost_is_budget" double precision,
	"lost_is_rank" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_metrics_device" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"campaign_id" integer,
	"device" text NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"cost" integer DEFAULT 0 NOT NULL,
	"conversions" double precision DEFAULT 0 NOT NULL,
	"ctr" double precision DEFAULT 0 NOT NULL,
	"conversion_rate" double precision DEFAULT 0 NOT NULL,
	"cpc" integer DEFAULT 0 NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_metrics_geo" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"campaign_id" integer,
	"region" text NOT NULL,
	"country" text DEFAULT 'DE' NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"cost" integer DEFAULT 0 NOT NULL,
	"conversions" double precision DEFAULT 0 NOT NULL,
	"cpa" integer,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_metrics_hour" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"campaign_id" integer,
	"hour" integer NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"cost" integer DEFAULT 0 NOT NULL,
	"conversions" double precision DEFAULT 0 NOT NULL,
	"conversion_rate" double precision DEFAULT 0 NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_search_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"campaign_id" integer,
	"search_term" text NOT NULL,
	"keyword" text,
	"match_type" text,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"cost" integer DEFAULT 0 NOT NULL,
	"conversions" double precision DEFAULT 0 NOT NULL,
	"cpa" integer,
	"status" text DEFAULT 'neutral' NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_ads_tracking_health" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"conversion_action_id" integer,
	"metric" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"details" text,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_intelligence_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"campaign_id" integer,
	"semrush_domain" text NOT NULL,
	"semrush_database" text DEFAULT 'de' NOT NULL,
	"sync_mode" text DEFAULT 'bidirektional' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_intelligence_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"conditions" text NOT NULL,
	"action" text NOT NULL,
	"action_config" text,
	"check_interval" text DEFAULT 'daily' NOT NULL,
	"last_evaluated_at" timestamp,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semrush_competitor_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer,
	"competitor_domain" text NOT NULL,
	"database" text DEFAULT 'de' NOT NULL,
	"common_keywords" integer DEFAULT 0 NOT NULL,
	"organic_keywords" integer DEFAULT 0 NOT NULL,
	"organic_traffic" integer DEFAULT 0 NOT NULL,
	"organic_cost" double precision DEFAULT 0 NOT NULL,
	"paid_keywords" integer DEFAULT 0 NOT NULL,
	"source" varchar(20) DEFAULT 'semrush' NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semrush_domain_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer,
	"domain" text NOT NULL,
	"database" text DEFAULT 'de' NOT NULL,
	"organic_keywords" integer DEFAULT 0 NOT NULL,
	"organic_traffic" integer DEFAULT 0 NOT NULL,
	"organic_cost" double precision DEFAULT 0 NOT NULL,
	"paid_keywords" integer DEFAULT 0 NOT NULL,
	"paid_traffic" integer DEFAULT 0 NOT NULL,
	"paid_cost" double precision DEFAULT 0 NOT NULL,
	"backlinks" integer DEFAULT 0 NOT NULL,
	"referring_domains" integer DEFAULT 0 NOT NULL,
	"authority_score" integer DEFAULT 0 NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semrush_keyword_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"link_id" integer,
	"keyword" text NOT NULL,
	"database" text DEFAULT 'de' NOT NULL,
	"search_volume" integer DEFAULT 0 NOT NULL,
	"cpc" double precision DEFAULT 0 NOT NULL,
	"competition" double precision DEFAULT 0 NOT NULL,
	"difficulty" integer,
	"intent" text,
	"organic_position" integer,
	"paid_position" integer,
	"organic_url" text,
	"traffic" integer DEFAULT 0 NOT NULL,
	"traffic_percent" double precision DEFAULT 0 NOT NULL,
	"source" varchar(20) DEFAULT 'semrush' NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"email_verified" timestamp,
	"username" text,
	"password_hash" text,
	"display_name" text,
	"bio" text,
	"avatar_url" text,
	"role" text DEFAULT 'user' NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"login_streak" integer DEFAULT 0 NOT NULL,
	"longest_login_streak" integer DEFAULT 0 NOT NULL,
	"last_login_date" text,
	"verified" boolean DEFAULT false NOT NULL,
	"locale" text DEFAULT 'de' NOT NULL,
	"admin_preferences" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_credentials" ADD CONSTRAINT "api_credentials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_credentials" ADD CONSTRAINT "api_credentials_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_core_web_vitals" ADD CONSTRAINT "gsc_core_web_vitals_link_id_search_intelligence_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."search_intelligence_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_index_coverage" ADD CONSTRAINT "gsc_index_coverage_link_id_search_intelligence_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."search_intelligence_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gsc_query_metrics" ADD CONSTRAINT "gsc_query_metrics_link_id_search_intelligence_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."search_intelligence_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutation_changeset_items" ADD CONSTRAINT "mutation_changeset_items_changeset_id_mutation_changesets_id_fk" FOREIGN KEY ("changeset_id") REFERENCES "public"."mutation_changesets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutation_changesets" ADD CONSTRAINT "mutation_changesets_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutation_changesets" ADD CONSTRAINT "mutation_changesets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutation_changesets" ADD CONSTRAINT "mutation_changesets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_backlink_snapshots" ADD CONSTRAINT "organic_backlink_snapshots_link_id_search_intelligence_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."search_intelligence_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_backlinks" ADD CONSTRAINT "organic_backlinks_link_id_search_intelligence_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."search_intelligence_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_disavow_entries" ADD CONSTRAINT "organic_disavow_entries_link_id_search_intelligence_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."search_intelligence_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_disavow_entries" ADD CONSTRAINT "organic_disavow_entries_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_keyword_universe" ADD CONSTRAINT "organic_keyword_universe_job_id_organic_masterplan_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."organic_masterplan_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_masterplan_jobs" ADD CONSTRAINT "organic_masterplan_jobs_link_id_search_intelligence_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."search_intelligence_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_masterplan_jobs" ADD CONSTRAINT "organic_masterplan_jobs_triggered_by_id_users_id_fk" FOREIGN KEY ("triggered_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_roadmap_items" ADD CONSTRAINT "organic_roadmap_items_cluster_id_organic_topic_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."organic_topic_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_roadmap_items" ADD CONSTRAINT "organic_roadmap_items_sprint_id_organic_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."organic_sprints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_serp_features" ADD CONSTRAINT "organic_serp_features_link_id_search_intelligence_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."search_intelligence_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_site_audit_issues" ADD CONSTRAINT "organic_site_audit_issues_run_id_organic_site_audit_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."organic_site_audit_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_site_audit_issues" ADD CONSTRAINT "organic_site_audit_issues_ticket_id_mutation_changeset_items_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."mutation_changeset_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_site_audit_runs" ADD CONSTRAINT "organic_site_audit_runs_link_id_search_intelligence_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."search_intelligence_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_sprints" ADD CONSTRAINT "organic_sprints_link_id_search_intelligence_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."search_intelligence_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_topic_clusters" ADD CONSTRAINT "organic_topic_clusters_job_id_organic_masterplan_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."organic_masterplan_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_visibility_snapshots" ADD CONSTRAINT "organic_visibility_snapshots_link_id_search_intelligence_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."search_intelligence_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_ad_groups" ADD CONSTRAINT "paid_ads_ad_groups_campaign_id_paid_ads_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."paid_ads_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_ad_groups" ADD CONSTRAINT "paid_ads_ad_groups_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_ads" ADD CONSTRAINT "paid_ads_ads_ad_group_id_paid_ads_ad_groups_id_fk" FOREIGN KEY ("ad_group_id") REFERENCES "public"."paid_ads_ad_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_ads" ADD CONSTRAINT "paid_ads_ads_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_alerts" ADD CONSTRAINT "paid_ads_alerts_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_alerts" ADD CONSTRAINT "paid_ads_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_assets" ADD CONSTRAINT "paid_ads_assets_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_audiences" ADD CONSTRAINT "paid_ads_audiences_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_audit_log" ADD CONSTRAINT "paid_ads_audit_log_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_audit_log" ADD CONSTRAINT "paid_ads_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_budget_pacing" ADD CONSTRAINT "paid_ads_budget_pacing_budget_plan_id_paid_ads_budget_plans_id_fk" FOREIGN KEY ("budget_plan_id") REFERENCES "public"."paid_ads_budget_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_budget_plans" ADD CONSTRAINT "paid_ads_budget_plans_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_budgets" ADD CONSTRAINT "paid_ads_budgets_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_budgets" ADD CONSTRAINT "paid_ads_budgets_campaign_id_paid_ads_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."paid_ads_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_campaigns" ADD CONSTRAINT "paid_ads_campaigns_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_conversion_actions" ADD CONSTRAINT "paid_ads_conversion_actions_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_conversion_events" ADD CONSTRAINT "paid_ads_conversion_events_conversion_action_id_paid_ads_conversion_actions_id_fk" FOREIGN KEY ("conversion_action_id") REFERENCES "public"."paid_ads_conversion_actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_conversion_events" ADD CONSTRAINT "paid_ads_conversion_events_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_integrations" ADD CONSTRAINT "paid_ads_integrations_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_keywords" ADD CONSTRAINT "paid_ads_keywords_ad_group_id_paid_ads_ad_groups_id_fk" FOREIGN KEY ("ad_group_id") REFERENCES "public"."paid_ads_ad_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_keywords" ADD CONSTRAINT "paid_ads_keywords_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_metrics_daily" ADD CONSTRAINT "paid_ads_metrics_daily_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_metrics_daily" ADD CONSTRAINT "paid_ads_metrics_daily_campaign_id_paid_ads_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."paid_ads_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_metrics_daily" ADD CONSTRAINT "paid_ads_metrics_daily_ad_group_id_paid_ads_ad_groups_id_fk" FOREIGN KEY ("ad_group_id") REFERENCES "public"."paid_ads_ad_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_metrics_device" ADD CONSTRAINT "paid_ads_metrics_device_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_metrics_device" ADD CONSTRAINT "paid_ads_metrics_device_campaign_id_paid_ads_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."paid_ads_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_metrics_geo" ADD CONSTRAINT "paid_ads_metrics_geo_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_metrics_geo" ADD CONSTRAINT "paid_ads_metrics_geo_campaign_id_paid_ads_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."paid_ads_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_metrics_hour" ADD CONSTRAINT "paid_ads_metrics_hour_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_metrics_hour" ADD CONSTRAINT "paid_ads_metrics_hour_campaign_id_paid_ads_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."paid_ads_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_search_terms" ADD CONSTRAINT "paid_ads_search_terms_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_search_terms" ADD CONSTRAINT "paid_ads_search_terms_campaign_id_paid_ads_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."paid_ads_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_tracking_health" ADD CONSTRAINT "paid_ads_tracking_health_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_ads_tracking_health" ADD CONSTRAINT "paid_ads_tracking_health_conversion_action_id_paid_ads_conversion_actions_id_fk" FOREIGN KEY ("conversion_action_id") REFERENCES "public"."paid_ads_conversion_actions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_intelligence_links" ADD CONSTRAINT "search_intelligence_links_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_intelligence_links" ADD CONSTRAINT "search_intelligence_links_campaign_id_paid_ads_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."paid_ads_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_intelligence_rules" ADD CONSTRAINT "search_intelligence_rules_account_id_paid_ads_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."paid_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_intelligence_rules" ADD CONSTRAINT "search_intelligence_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semrush_competitor_data" ADD CONSTRAINT "semrush_competitor_data_link_id_search_intelligence_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."search_intelligence_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semrush_domain_history" ADD CONSTRAINT "semrush_domain_history_link_id_search_intelligence_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."search_intelligence_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semrush_keyword_data" ADD CONSTRAINT "semrush_keyword_data_link_id_search_intelligence_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."search_intelligence_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_perms_user_key_idx" ON "admin_permissions" USING btree ("user_id","permission_key");--> statement-breakpoint
CREATE INDEX "admin_perms_user_idx" ON "admin_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_cred_provider_key_unique" ON "api_credentials" USING btree ("provider","credential_key");--> statement-breakpoint
CREATE INDEX "api_cred_provider_idx" ON "api_credentials" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "gsc_cwv_link_idx" ON "gsc_core_web_vitals" USING btree ("link_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gsc_cwv_unique" ON "gsc_core_web_vitals" USING btree ("link_id","url","form_factor");--> statement-breakpoint
CREATE INDEX "gsc_ix_link_verdict_idx" ON "gsc_index_coverage" USING btree ("link_id","verdict");--> statement-breakpoint
CREATE UNIQUE INDEX "gsc_ix_link_url_unique" ON "gsc_index_coverage" USING btree ("link_id","url");--> statement-breakpoint
CREATE INDEX "gsc_qm_link_date_idx" ON "gsc_query_metrics" USING btree ("link_id","date");--> statement-breakpoint
CREATE INDEX "gsc_qm_page_idx" ON "gsc_query_metrics" USING btree ("page");--> statement-breakpoint
CREATE INDEX "gsc_qm_query_idx" ON "gsc_query_metrics" USING btree ("query");--> statement-breakpoint
CREATE UNIQUE INDEX "gsc_qm_unique" ON "gsc_query_metrics" USING btree ("link_id","date","page","query","device");--> statement-breakpoint
CREATE INDEX "mutation_changeset_items_changeset_idx" ON "mutation_changeset_items" USING btree ("changeset_id");--> statement-breakpoint
CREATE INDEX "mutation_changeset_items_entity_idx" ON "mutation_changeset_items" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "mutation_changesets_account_idx" ON "mutation_changesets" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "mutation_changesets_status_idx" ON "mutation_changesets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mutation_changesets_scope_idx" ON "mutation_changesets" USING btree ("scope","status");--> statement-breakpoint
CREATE INDEX "mutation_changesets_created_by_idx" ON "mutation_changesets" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "organic_bl_snap_link_idx" ON "organic_backlink_snapshots" USING btree ("link_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organic_bl_snap_unique" ON "organic_backlink_snapshots" USING btree ("link_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "organic_bl_link_idx" ON "organic_backlinks" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "organic_bl_status_idx" ON "organic_backlinks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organic_bl_tox_idx" ON "organic_backlinks" USING btree ("toxicity_score");--> statement-breakpoint
CREATE UNIQUE INDEX "organic_bl_unique" ON "organic_backlinks" USING btree ("link_id","source_url","target_url");--> statement-breakpoint
CREATE INDEX "organic_disavow_link_idx" ON "organic_disavow_entries" USING btree ("link_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organic_disavow_unique" ON "organic_disavow_entries" USING btree ("link_id","domain_or_url");--> statement-breakpoint
CREATE INDEX "organic_ku_job_idx" ON "organic_keyword_universe" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "organic_ku_cluster_idx" ON "organic_keyword_universe" USING btree ("cluster_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organic_ku_unique" ON "organic_keyword_universe" USING btree ("job_id","keyword");--> statement-breakpoint
CREATE INDEX "organic_mp_job_link_idx" ON "organic_masterplan_jobs" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "organic_mp_job_status_idx" ON "organic_masterplan_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organic_ri_cluster_idx" ON "organic_roadmap_items" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "organic_ri_sprint_idx" ON "organic_roadmap_items" USING btree ("sprint_id");--> statement-breakpoint
CREATE INDEX "organic_ri_status_idx" ON "organic_roadmap_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organic_serp_link_idx" ON "organic_serp_features" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "organic_serp_opp_idx" ON "organic_serp_features" USING btree ("opportunity_score");--> statement-breakpoint
CREATE UNIQUE INDEX "organic_serp_unique" ON "organic_serp_features" USING btree ("link_id","keyword","database");--> statement-breakpoint
CREATE INDEX "organic_audit_issues_run_idx" ON "organic_site_audit_issues" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "organic_audit_issues_severity_idx" ON "organic_site_audit_issues" USING btree ("severity");--> statement-breakpoint
CREATE UNIQUE INDEX "organic_audit_issues_unique" ON "organic_site_audit_issues" USING btree ("run_id","issue_code");--> statement-breakpoint
CREATE INDEX "organic_audit_link_idx" ON "organic_site_audit_runs" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "organic_audit_status_idx" ON "organic_site_audit_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organic_sprint_link_idx" ON "organic_sprints" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "organic_sprint_status_idx" ON "organic_sprints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organic_tc_job_idx" ON "organic_topic_clusters" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "organic_tc_priority_idx" ON "organic_topic_clusters" USING btree ("priority_score");--> statement-breakpoint
CREATE INDEX "organic_vis_link_date_idx" ON "organic_visibility_snapshots" USING btree ("link_id","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "organic_vis_link_domain_date_unique" ON "organic_visibility_snapshots" USING btree ("link_id","domain","snapshot_date");--> statement-breakpoint
CREATE INDEX "paid_ads_accounts_external_id_idx" ON "paid_ads_accounts" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "paid_ads_accounts_parent_idx" ON "paid_ads_accounts" USING btree ("parent_account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_accounts_status_idx" ON "paid_ads_accounts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "paid_ads_ad_groups_campaign_idx" ON "paid_ads_ad_groups" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "paid_ads_ad_groups_account_idx" ON "paid_ads_ad_groups" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_ad_groups_external_idx" ON "paid_ads_ad_groups" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "paid_ads_ad_groups_status_idx" ON "paid_ads_ad_groups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "paid_ads_ads_ad_group_idx" ON "paid_ads_ads" USING btree ("ad_group_id");--> statement-breakpoint
CREATE INDEX "paid_ads_ads_account_idx" ON "paid_ads_ads" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_ads_external_idx" ON "paid_ads_ads" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "paid_ads_ads_status_idx" ON "paid_ads_ads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "paid_ads_ads_approval_idx" ON "paid_ads_ads" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "paid_ads_alerts_account_idx" ON "paid_ads_alerts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_alerts_type_idx" ON "paid_ads_alerts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "paid_ads_alerts_severity_idx" ON "paid_ads_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "paid_ads_alerts_status_idx" ON "paid_ads_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "paid_ads_assets_account_idx" ON "paid_ads_assets" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_assets_type_idx" ON "paid_ads_assets" USING btree ("type");--> statement-breakpoint
CREATE INDEX "paid_ads_assets_status_idx" ON "paid_ads_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "paid_ads_audiences_account_idx" ON "paid_ads_audiences" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_audiences_type_idx" ON "paid_ads_audiences" USING btree ("type");--> statement-breakpoint
CREATE INDEX "paid_ads_audiences_status_idx" ON "paid_ads_audiences" USING btree ("status");--> statement-breakpoint
CREATE INDEX "paid_ads_audit_log_account_idx" ON "paid_ads_audit_log" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_audit_log_user_idx" ON "paid_ads_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "paid_ads_audit_log_entity_idx" ON "paid_ads_audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "paid_ads_audit_log_created_idx" ON "paid_ads_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "paid_ads_budget_pacing_plan_idx" ON "paid_ads_budget_pacing" USING btree ("budget_plan_id");--> statement-breakpoint
CREATE INDEX "paid_ads_budget_pacing_date_idx" ON "paid_ads_budget_pacing" USING btree ("date");--> statement-breakpoint
CREATE INDEX "paid_ads_budget_plans_account_idx" ON "paid_ads_budget_plans" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_budget_plans_month_idx" ON "paid_ads_budget_plans" USING btree ("month");--> statement-breakpoint
CREATE INDEX "paid_ads_budget_plans_status_idx" ON "paid_ads_budget_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "paid_ads_budgets_account_idx" ON "paid_ads_budgets" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_budgets_campaign_idx" ON "paid_ads_budgets" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "paid_ads_budgets_status_idx" ON "paid_ads_budgets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "paid_ads_campaigns_account_idx" ON "paid_ads_campaigns" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_campaigns_external_idx" ON "paid_ads_campaigns" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "paid_ads_campaigns_status_idx" ON "paid_ads_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "paid_ads_campaigns_type_idx" ON "paid_ads_campaigns" USING btree ("type");--> statement-breakpoint
CREATE INDEX "paid_ads_campaigns_sync_idx" ON "paid_ads_campaigns" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "paid_ads_conv_actions_account_idx" ON "paid_ads_conversion_actions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_conv_actions_category_idx" ON "paid_ads_conversion_actions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "paid_ads_conv_actions_status_idx" ON "paid_ads_conversion_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "paid_ads_conv_actions_tag_idx" ON "paid_ads_conversion_actions" USING btree ("tag_status");--> statement-breakpoint
CREATE INDEX "paid_ads_conv_events_action_idx" ON "paid_ads_conversion_events" USING btree ("conversion_action_id");--> statement-breakpoint
CREATE INDEX "paid_ads_conv_events_account_idx" ON "paid_ads_conversion_events" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_conv_events_gclid_idx" ON "paid_ads_conversion_events" USING btree ("gclid");--> statement-breakpoint
CREATE INDEX "paid_ads_conv_events_upload_idx" ON "paid_ads_conversion_events" USING btree ("upload_status");--> statement-breakpoint
CREATE INDEX "paid_ads_integrations_account_idx" ON "paid_ads_integrations" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_integrations_platform_idx" ON "paid_ads_integrations" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "paid_ads_integrations_status_idx" ON "paid_ads_integrations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "paid_ads_keywords_ad_group_idx" ON "paid_ads_keywords" USING btree ("ad_group_id");--> statement-breakpoint
CREATE INDEX "paid_ads_keywords_account_idx" ON "paid_ads_keywords" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_keywords_match_idx" ON "paid_ads_keywords" USING btree ("match_type");--> statement-breakpoint
CREATE INDEX "paid_ads_keywords_status_idx" ON "paid_ads_keywords" USING btree ("status");--> statement-breakpoint
CREATE INDEX "paid_ads_metrics_daily_account_idx" ON "paid_ads_metrics_daily" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_metrics_daily_campaign_idx" ON "paid_ads_metrics_daily" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "paid_ads_metrics_daily_date_idx" ON "paid_ads_metrics_daily" USING btree ("date");--> statement-breakpoint
CREATE INDEX "paid_ads_metrics_daily_account_date_idx" ON "paid_ads_metrics_daily" USING btree ("account_id","date");--> statement-breakpoint
CREATE INDEX "pa_dev_account_idx" ON "paid_ads_metrics_device" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pa_dev_account_device_unique" ON "paid_ads_metrics_device" USING btree ("account_id","device");--> statement-breakpoint
CREATE INDEX "pa_geo_account_idx" ON "paid_ads_metrics_geo" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "pa_geo_region_idx" ON "paid_ads_metrics_geo" USING btree ("region");--> statement-breakpoint
CREATE INDEX "pa_hour_account_idx" ON "paid_ads_metrics_hour" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pa_hour_account_hour_unique" ON "paid_ads_metrics_hour" USING btree ("account_id","hour");--> statement-breakpoint
CREATE INDEX "pa_st_account_idx" ON "paid_ads_search_terms" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "pa_st_status_idx" ON "paid_ads_search_terms" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "pa_st_account_term_unique" ON "paid_ads_search_terms" USING btree ("account_id","search_term");--> statement-breakpoint
CREATE INDEX "paid_ads_tracking_health_account_idx" ON "paid_ads_tracking_health" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "paid_ads_tracking_health_metric_idx" ON "paid_ads_tracking_health" USING btree ("metric");--> statement-breakpoint
CREATE INDEX "paid_ads_tracking_health_status_idx" ON "paid_ads_tracking_health" USING btree ("status");--> statement-breakpoint
CREATE INDEX "paid_ads_tracking_health_severity_idx" ON "paid_ads_tracking_health" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "si_links_account_idx" ON "search_intelligence_links" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "si_links_campaign_idx" ON "search_intelligence_links" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "si_links_active_idx" ON "search_intelligence_links" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "search_intelligence_rules_account_idx" ON "search_intelligence_rules" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "search_intelligence_rules_active_idx" ON "search_intelligence_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "search_intelligence_rules_interval_idx" ON "search_intelligence_rules" USING btree ("check_interval");--> statement-breakpoint
CREATE INDEX "sr_comp_link_idx" ON "semrush_competitor_data" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "sr_comp_source_idx" ON "semrush_competitor_data" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "sr_comp_link_domain_unique" ON "semrush_competitor_data" USING btree ("link_id","competitor_domain");--> statement-breakpoint
CREATE INDEX "sr_hist_link_idx" ON "semrush_domain_history" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "sr_hist_synced_idx" ON "semrush_domain_history" USING btree ("synced_at");--> statement-breakpoint
CREATE INDEX "sr_kw_link_idx" ON "semrush_keyword_data" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "sr_kw_keyword_idx" ON "semrush_keyword_data" USING btree ("keyword");--> statement-breakpoint
CREATE INDEX "sr_kw_source_idx" ON "semrush_keyword_data" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "sr_kw_link_keyword_source_unique" ON "semrush_keyword_data" USING btree ("link_id","keyword","source");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");