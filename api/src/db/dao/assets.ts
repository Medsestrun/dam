import { eq, and, desc, sql, ilike, or, inArray } from "drizzle-orm";
import { db } from "../index";
import {
  assets,
  assetVersions,
  renditions,
  annotations,
  commentThreads,
  type Asset,
  type AssetVersion,
} from "../schema";

export type CreateAssetInput = {
  projectId?: string;
  title?: string;
  description?: string;
  type: "image" | "video" | "audio" | "pdf" | "doc" | "xls" | "ppt" | "other";
  status?: "draft" | "in_review" | "approved" | "rejected" | "archived";
  tags?: string[];
  createdBy: string;
};

export const createAsset = async (input: CreateAssetInput): Promise<Asset> => {
  const [asset] = await db
    .insert(assets)
    .values({
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      type: input.type,
      status: input.status || "draft",
      tags: input.tags || [],
      createdBy: input.createdBy,
    })
    .returning();
  return asset;
};

export const getAssetById = async (id: string): Promise<Asset | null> => {
  const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  return asset || null;
};

export const getAssets = async (params: {
  query?: string;
  type?: string;
  status?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}) => {
  const conditions = [];

  if (params.query) {
    conditions.push(
      or(
        ilike(assets.title, `%${params.query}%`),
        ilike(assets.description, `%${params.query}%`),
      )!,
    );
  }

  if (params.type) {
    conditions.push(eq(assets.type, params.type as any));
  }

  if (params.status) {
    conditions.push(eq(assets.status, params.status as any));
  }

  if (params.tags && params.tags.length > 0) {
    conditions.push(sql`${assets.tags} && ${params.tags}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const results = await db
    .select()
    .from(assets)
    .where(whereClause)
    .orderBy(desc(assets.createdAt))
    .limit(params.limit || 50)
    .offset(params.offset || 0);

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(assets)
    .where(whereClause);

  return {
    items: results,
    total: Number(total[0]?.count || 0),
  };
};

export const updateAsset = async (
  id: string,
  updates: Partial<Omit<Asset, "id" | "createdAt">>,
): Promise<Asset | null> => {
  const [updated] = await db
    .update(assets)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(assets.id, id))
    .returning();
  return updated || null;
};

export const deleteAsset = async (id: string): Promise<boolean> => {
  const result = await db.delete(assets).where(eq(assets.id, id));
  return result.rowCount > 0;
};

