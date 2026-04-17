CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'engagement_user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"password_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'employer' NOT NULL,
	"sector" text NOT NULL,
	"region" text,
	"status" text DEFAULT 'prospect' NOT NULL,
	"owner_user_id" integer,
	"website" text,
	"phone" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"job_title" text,
	"email" text,
	"phone" text,
	"preferred_contact_method" text DEFAULT 'email',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagements" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer,
	"primary_contact_id" integer,
	"owner_user_id" integer,
	"title" text NOT NULL,
	"stage" text DEFAULT 'lead' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"expected_learner_volume" integer,
	"expected_value" numeric(12, 2),
	"probability" integer,
	"last_contact_date" text,
	"next_action_date" text,
	"next_action_note" text,
	"notes" text,
	"engagement_type" text DEFAULT 'employer_engagement' NOT NULL,
	"sdr_stage" text,
	"qualification_status" text,
	"lead_source" text,
	"sdr_owner_user_id" integer,
	"last_outreach_date" text,
	"next_outreach_date" text,
	"outreach_channel" text,
	"touch_count" integer DEFAULT 0 NOT NULL,
	"meeting_booked" boolean DEFAULT false NOT NULL,
	"meeting_date" text,
	"disqualification_reason" text,
	"handover_status" text,
	"handover_owner_user_id" integer,
	"handover_notes" text,
	"call_attempt_count" integer DEFAULT 0 NOT NULL,
	"last_call_date" text,
	"next_call_date" text,
	"last_call_outcome" text,
	"contact_made" boolean DEFAULT false NOT NULL,
	"voicemail_left" boolean DEFAULT false NOT NULL,
	"follow_up_required" boolean DEFAULT false NOT NULL,
	"follow_up_reason" text,
	"mql_status" boolean DEFAULT false NOT NULL,
	"sql_status" boolean DEFAULT false NOT NULL,
	"opportunity_created" boolean DEFAULT false NOT NULL,
	"latest_note" text,
	"pitch_deck_sent" boolean DEFAULT false NOT NULL,
	"info_sent_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer,
	"engagement_id" integer,
	"assigned_user_id" integer,
	"title" text NOT NULL,
	"description" text,
	"due_date" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"actor_user_id" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organisations" ADD CONSTRAINT "organisations_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_primary_contact_id_contacts_id_fk" FOREIGN KEY ("primary_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_sdr_owner_user_id_users_id_fk" FOREIGN KEY ("sdr_owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_handover_owner_user_id_users_id_fk" FOREIGN KEY ("handover_owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_is_active_idx" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "organisations_name_idx" ON "organisations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "organisations_status_idx" ON "organisations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organisations_type_idx" ON "organisations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "organisations_owner_user_id_idx" ON "organisations" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "organisations_sector_idx" ON "organisations" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "organisations_region_idx" ON "organisations" USING btree ("region");--> statement-breakpoint
CREATE INDEX "contacts_organisation_id_idx" ON "contacts" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "contacts_last_name_idx" ON "contacts" USING btree ("last_name");--> statement-breakpoint
CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "engagements_organisation_id_idx" ON "engagements" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "engagements_owner_user_id_idx" ON "engagements" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "engagements_stage_idx" ON "engagements" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "engagements_status_idx" ON "engagements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "engagements_next_action_date_idx" ON "engagements" USING btree ("next_action_date");--> statement-breakpoint
CREATE INDEX "engagements_engagement_type_idx" ON "engagements" USING btree ("engagement_type");--> statement-breakpoint
CREATE INDEX "engagements_sdr_stage_idx" ON "engagements" USING btree ("sdr_stage");--> statement-breakpoint
CREATE INDEX "engagements_sdr_owner_user_id_idx" ON "engagements" USING btree ("sdr_owner_user_id");--> statement-breakpoint
CREATE INDEX "engagements_handover_owner_user_id_idx" ON "engagements" USING btree ("handover_owner_user_id");--> statement-breakpoint
CREATE INDEX "engagements_next_call_date_idx" ON "engagements" USING btree ("next_call_date");--> statement-breakpoint
CREATE INDEX "tasks_organisation_id_idx" ON "tasks" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "tasks_engagement_id_idx" ON "tasks" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "tasks_assigned_user_id_idx" ON "tasks" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_priority_idx" ON "tasks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tasks_due_date_idx" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "activity_log_entity_idx" ON "activity_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activity_log_actor_idx" ON "activity_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "activity_log_event_type_idx" ON "activity_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "activity_log_created_at_idx" ON "activity_log" USING btree ("created_at");