ALTER TABLE "users" ADD COLUMN "reset_code_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reset_expires" timestamp;