CREATE TYPE "public"."rsvp_status" AS ENUM('pending', 'attending', 'declined', 'maybe');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wedding_guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"party_label" varchar(200),
	"max_party_size" integer DEFAULT 1 NOT NULL,
	"code" varchar(24) NOT NULL,
	"rsvp_status" "rsvp_status" DEFAULT 'pending' NOT NULL,
	"attending_count" integer,
	"rsvp_data" jsonb DEFAULT '{}'::jsonb,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wedding_guests" ADD CONSTRAINT "wedding_guests_org_id_organizers_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- References the live "events" table (legacy Supabase-managed flat table,
-- not the unused Drizzle-modeled one) — wrapped so this migration doesn't
-- hard-fail if that table's id column type or existence ever differs from
-- what's expected here.
DO $$ BEGIN
 ALTER TABLE "wedding_guests" ADD CONSTRAINT "wedding_guests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN undefined_table THEN null;
 WHEN undefined_column THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wedding_guests_event_code_idx" ON "wedding_guests" USING btree ("event_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wedding_guests_event_idx" ON "wedding_guests" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wedding_guests_org_idx" ON "wedding_guests" USING btree ("org_id");
