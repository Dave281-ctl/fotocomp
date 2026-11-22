DROP INDEX "theme_members_one_active";--> statement-breakpoint
CREATE UNIQUE INDEX "theme_members_active" ON "theme_members" USING btree ("theme_id","user_id") WHERE "theme_members"."left_at" is null;