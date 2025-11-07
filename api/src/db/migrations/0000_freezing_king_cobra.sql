CREATE TYPE "public"."annotation_kind" AS ENUM('pin', 'rect', 'arrow', 'highlight', 'text');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('draft', 'in_review', 'approved', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('image', 'video', 'audio', 'pdf', 'doc', 'xls', 'ppt', 'other');--> statement-breakpoint
CREATE TYPE "public"."permission_object_type" AS ENUM('asset', 'project');--> statement-breakpoint
CREATE TYPE "public"."permission_role" AS ENUM('owner', 'editor', 'viewer', 'guest');--> statement-breakpoint
CREATE TYPE "public"."permission_subject_type" AS ENUM('user', 'group');--> statement-breakpoint
CREATE TYPE "public"."rendition_kind" AS ENUM('thumb', 'preview', 'page', 'tile', 'webp');--> statement-breakpoint
CREATE TYPE "public"."thread_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."upload_state" AS ENUM('initiated', 'uploading', 'completed', 'aborted');--> statement-breakpoint
CREATE TYPE "public"."upload_target" AS ENUM('new_asset', 'new_version');--> statement-breakpoint
CREATE TABLE "annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"page" integer,
	"kind" "annotation_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	"author_id" uuid NOT NULL,
	"thread_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "asset_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"bucket" varchar(255) NOT NULL,
	"key" varchar(1000) NOT NULL,
	"size" bigint NOT NULL,
	"sha256" varchar(64),
	"mime" varchar(255) NOT NULL,
	"width" integer,
	"height" integer,
	"pages" integer,
	"tech_meta" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"title" varchar(500),
	"description" text,
	"type" "asset_type" NOT NULL,
	"status" "asset_status" DEFAULT 'draft' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"current_version_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"page" integer,
	"status" "thread_status" DEFAULT 'open' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" "permission_subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"object_type" "permission_object_type" NOT NULL,
	"object_id" uuid NOT NULL,
	"role" "permission_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_version_id" uuid NOT NULL,
	"kind" "rendition_kind" NOT NULL,
	"bucket" varchar(255) NOT NULL,
	"key" varchar(1000) NOT NULL,
	"width" integer,
	"height" integer,
	"page" integer,
	"ready" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target" "upload_target" NOT NULL,
	"asset_id" uuid,
	"file_name" varchar(500) NOT NULL,
	"mime" varchar(255) NOT NULL,
	"total_size" bigint NOT NULL,
	"part_size" bigint NOT NULL,
	"s3_upload_id" varchar(255),
	"bucket" varchar(255) NOT NULL,
	"key_temp" varchar(1000) NOT NULL,
	"received_bytes" bigint DEFAULT 0,
	"state" "upload_state" DEFAULT 'initiated' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_version_id_asset_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."asset_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_versions" ADD CONSTRAINT "asset_versions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_threads" ADD CONSTRAINT "comment_threads_version_id_asset_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."asset_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_thread_id_comment_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."comment_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renditions" ADD CONSTRAINT "renditions_asset_version_id_asset_versions_id_fk" FOREIGN KEY ("asset_version_id") REFERENCES "public"."asset_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_versions_asset_id_idx" ON "asset_versions" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_versions_version_idx" ON "asset_versions" USING btree ("version");--> statement-breakpoint
CREATE INDEX "asset_versions_asset_version_idx" ON "asset_versions" USING btree ("asset_id","version");--> statement-breakpoint
CREATE INDEX "assets_type_idx" ON "assets" USING btree ("type");--> statement-breakpoint
CREATE INDEX "assets_status_idx" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assets_tags_idx" ON "assets" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "assets_title_idx" ON "assets" USING btree ("title");