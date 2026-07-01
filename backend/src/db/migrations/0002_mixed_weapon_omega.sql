DO $$ BEGIN
  CREATE TYPE "public"."account_type" AS ENUM('individual', 'organisation');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "organizers" ADD COLUMN IF NOT EXISTS "account_type" "account_type" DEFAULT 'individual' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizers" ADD COLUMN IF NOT EXISTS "expected_guests" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_expires" timestamp;
