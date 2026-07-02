CREATE TYPE "public"."wallet_txn_type" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_method" AS ENUM('bank', 'crypto');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'approved', 'paid', 'rejected');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"type" "wallet_txn_type" NOT NULL,
	"amount_kobo" integer NOT NULL,
	"event_id" varchar(100),
	"event_title" varchar(300),
	"ticket_id" varchar(100),
	"payment_ref" varchar(200),
	"withdrawal_id" uuid,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"requested_by" uuid,
	"amount_kobo" integer NOT NULL,
	"method" "withdrawal_method" NOT NULL,
	"status" "withdrawal_status" DEFAULT 'pending' NOT NULL,
	"bank_code" varchar(20),
	"bank_name" varchar(120),
	"account_number" varchar(20),
	"account_name" varchar(200),
	"crypto_asset" varchar(20),
	"crypto_network" varchar(30),
	"crypto_address" varchar(200),
	"paystack_transfer_code" varchar(100),
	"provider_reference" varchar(200),
	"admin_note" text,
	"processed_by" uuid,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_org_id_organizers_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_withdrawal_id_withdrawals_id_fk" FOREIGN KEY ("withdrawal_id") REFERENCES "public"."withdrawals"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_org_id_organizers_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallet_txn_org_idx" ON "wallet_transactions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallet_txn_ref_idx" ON "wallet_transactions" USING btree ("payment_ref");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "withdrawals_org_idx" ON "withdrawals" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "withdrawals_status_idx" ON "withdrawals" USING btree ("status");