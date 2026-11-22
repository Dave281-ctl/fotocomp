ALTER TABLE "users" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
-- Wer schon dabei ist, braucht keine Einführung mehr.
UPDATE "users" SET "onboarded_at" = now();
