import { pgTable, pgEnum, uuid, varchar, integer, bigint, jsonb, boolean, timestamp, text, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const assetTypeEnum = pgEnum("asset_type", [
  "image",
  "video",
  "audio",
  "pdf",
  "doc",
  "xls",
  "ppt",
  "other",
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "draft",
  "in_review",
  "approved",
  "rejected",
  "archived",
]);

export const uploadTargetEnum = pgEnum("upload_target", [
  "new_asset",
  "new_version",
]);

export const uploadStateEnum = pgEnum("upload_state", [
  "initiated",
  "uploading",
  "completed",
  "aborted",
]);

export const renditionKindEnum = pgEnum("rendition_kind", [
  "thumb",
  "preview",
  "page",
  "tile",
  "webp",
]);

export const annotationKindEnum = pgEnum("annotation_kind", [
  "pin",
  "rect",
  "arrow",
  "highlight",
  "text",
]);

export const threadStatusEnum = pgEnum("thread_status", [
  "open",
  "resolved",
]);

export const permissionSubjectTypeEnum = pgEnum("permission_subject_type", [
  "user",
  "group",
]);

export const permissionObjectTypeEnum = pgEnum("permission_object_type", [
  "asset",
  "project",
]);

export const permissionRoleEnum = pgEnum("permission_role", [
  "owner",
  "editor",
  "viewer",
  "guest",
]);

// Assets table
export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id"),
    title: varchar("title", { length: 500 }),
    description: text("description"),
    type: assetTypeEnum("type").notNull(),
    status: assetStatusEnum("status").default("draft").notNull(),
    tags: jsonb("tags").$type<string[]>().default([]),
    currentVersionId: uuid("current_version_id"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index("assets_type_idx").on(table.type),
    statusIdx: index("assets_status_idx").on(table.status),
    tagsIdx: index("assets_tags_idx").using("gin", table.tags),
    titleIdx: index("assets_title_idx").on(table.title),
  }),
);

// Asset versions table
export const assetVersions = pgTable(
  "asset_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id").notNull().references(() => assets.id, {
      onDelete: "cascade",
    }),
    version: integer("version").notNull(),
    bucket: varchar("bucket", { length: 255 }).notNull(),
    key: varchar("key", { length: 1000 }).notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    sha256: varchar("sha256", { length: 64 }),
    mime: varchar("mime", { length: 255 }).notNull(),
    width: integer("width"),
    height: integer("height"),
    pages: integer("pages"),
    techMeta: jsonb("tech_meta").$type<Record<string, unknown>>(),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    assetIdIdx: index("asset_versions_asset_id_idx").on(table.assetId),
    versionIdx: index("asset_versions_version_idx").on(table.version),
    assetVersionIdx: index("asset_versions_asset_version_idx").on(
      table.assetId,
      table.version,
    ),
  }),
);

// Upload sessions table
export const uploadSessions = pgTable("upload_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  target: uploadTargetEnum("target").notNull(),
  assetId: uuid("asset_id"),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  mime: varchar("mime", { length: 255 }).notNull(),
  totalSize: bigint("total_size", { mode: "number" }).notNull(),
  partSize: bigint("part_size", { mode: "number" }).notNull(),
  s3UploadId: varchar("s3_upload_id", { length: 255 }),
  bucket: varchar("bucket", { length: 255 }).notNull(),
  keyTemp: varchar("key_temp", { length: 1000 }).notNull(),
  receivedBytes: bigint("received_bytes", { mode: "number" }).default(0),
  state: uploadStateEnum("state").default("initiated").notNull(),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Renditions table
export const renditions = pgTable("renditions", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetVersionId: uuid("asset_version_id")
    .notNull()
    .references(() => assetVersions.id, { onDelete: "cascade" }),
  kind: renditionKindEnum("kind").notNull(),
  bucket: varchar("bucket", { length: 255 }).notNull(),
  key: varchar("key", { length: 1000 }).notNull(),
  width: integer("width"),
  height: integer("height"),
  page: integer("page"),
  ready: boolean("ready").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Annotations table
export const annotations = pgTable("annotations", {
  id: uuid("id").defaultRandom().primaryKey(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => assetVersions.id, { onDelete: "cascade" }),
  page: integer("page"),
  kind: annotationKindEnum("kind").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  authorId: uuid("author_id").notNull(),
  threadId: uuid("thread_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Comment threads table
export const commentThreads = pgTable("comment_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => assetVersions.id, { onDelete: "cascade" }),
  page: integer("page"),
  status: threadStatusEnum("status").default("open").notNull(),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Comments table
export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => commentThreads.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Permissions table
export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectType: permissionSubjectTypeEnum("subject_type").notNull(),
  subjectId: uuid("subject_id").notNull(),
  objectType: permissionObjectTypeEnum("object_type").notNull(),
  objectId: uuid("object_id").notNull(),
  role: permissionRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const assetsRelations = relations(assets, ({ many, one }) => ({
  versions: many(assetVersions),
  currentVersion: one(assetVersions, {
    fields: [assets.currentVersionId],
    references: [assetVersions.id],
  }),
}));

export const assetVersionsRelations = relations(assetVersions, ({ one, many }) => ({
  asset: one(assets, {
    fields: [assetVersions.assetId],
    references: [assets.id],
  }),
  renditions: many(renditions),
  annotations: many(annotations),
  threads: many(commentThreads),
}));

export const renditionsRelations = relations(renditions, ({ one }) => ({
  assetVersion: one(assetVersions, {
    fields: [renditions.assetVersionId],
    references: [assetVersions.id],
  }),
}));

export const annotationsRelations = relations(annotations, ({ one }) => ({
  version: one(assetVersions, {
    fields: [annotations.versionId],
    references: [assetVersions.id],
  }),
  thread: one(commentThreads, {
    fields: [annotations.threadId],
    references: [commentThreads.id],
  }),
}));

export const commentThreadsRelations = relations(commentThreads, ({ one, many }) => ({
  version: one(assetVersions, {
    fields: [commentThreads.versionId],
    references: [assetVersions.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  thread: one(commentThreads, {
    fields: [comments.threadId],
    references: [commentThreads.id],
  }),
}));

// Type exports
export type Asset = typeof assets.$inferSelect;
export type AssetVersion = typeof assetVersions.$inferSelect;
export type UploadSession = typeof uploadSessions.$inferSelect;
export type Rendition = typeof renditions.$inferSelect;
export type Annotation = typeof annotations.$inferSelect;
export type CommentThread = typeof commentThreads.$inferSelect;
export type Comment = typeof comments.$inferSelect;

