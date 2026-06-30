CREATE TYPE "public"."event_status" AS ENUM('draft', 'upcoming', 'live', 'ended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."org_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'organizer', 'staff');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('pending_payment', 'unused', 'used', 'refunded', 'void');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"category" varchar(100),
	"date" varchar(20) NOT NULL,
	"time" varchar(10),
	"end_time" varchar(10),
	"venue" varchar(300) NOT NULL,
	"city" varchar(120),
	"banner_url" text,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"reg_fields" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"contact_name" varchar(200),
	"phone" varchar(30),
	"id_type" varchar(50),
	"id_number" varchar(100),
	"status" "org_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scan_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid,
	"event_id" uuid NOT NULL,
	"gate_id" uuid,
	"staff_id" uuid,
	"status" varchar(20) NOT NULL,
	"reason" text,
	"scanned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"price_kobo" integer DEFAULT 0 NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"sold" integer DEFAULT 0 NOT NULL,
	"gate_id" uuid,
	"sales_start" timestamp,
	"sales_end" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"ticket_type_id" uuid,
	"gate_id" uuid,
	"code" text NOT NULL,
	"holder_name" varchar(200) NOT NULL,
	"holder_email" varchar(255),
	"holder_phone" varchar(30),
	"custom_data" jsonb DEFAULT '{}'::jsonb,
	"status" "ticket_status" DEFAULT 'pending_payment' NOT NULL,
	"payment_ref" varchar(200),
	"payment_provider" varchar(30),
	"is_manual" boolean DEFAULT false,
	"issued_by" uuid,
	"note" text,
	"checked_in_at" timestamp,
	"checked_in_by" uuid,
	"registered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(200),
	"role" "role" NOT NULL,
	"org_id" uuid,
	"status" "org_status" DEFAULT 'approved' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_org_id_organizers_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gates" ADD CONSTRAINT "gates_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_gate_id_gates_id_fk" FOREIGN KEY ("gate_id") REFERENCES "public"."gates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_gate_id_gates_id_fk" FOREIGN KEY ("gate_id") REFERENCES "public"."gates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ticket_type_id_ticket_types_id_fk" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_gate_id_gates_id_fk" FOREIGN KEY ("gate_id") REFERENCES "public"."gates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizers_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_org_idx" ON "events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_logs_event_idx" ON "scan_logs" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_types_event_idx" ON "ticket_types" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_event_idx" ON "tickets" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_payment_ref_idx" ON "tickets" USING btree ("payment_ref");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_code_idx" ON "tickets" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");