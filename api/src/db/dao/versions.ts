import { eq, and, desc } from "drizzle-orm";
import { db } from "../index";
import { assetVersions, assets, type AssetVersion } from "../schema";

export type CreateVersionInput = {
  assetId: string;
  version: number;
  bucket: string;
  key: string;
  size: number;
  sha256?: string;
  mime: string;
  width?: number;
  height?: number;
  pages?: number;
  techMeta?: Record<string, unknown>;
  createdBy: string;
};

export const createVersion = async (
  input: CreateVersionInput,
): Promise<AssetVersion> => {
  const [version] = await db
    .insert(assetVersions)
    .values(input)
    .returning();
  return version;
};

export const getVersionById = async (
  id: string,
): Promise<AssetVersion | null> => {
  const [version] = await db
    .select()
    .from(assetVersions)
    .where(eq(assetVersions.id, id))
    .limit(1);
  return version || null;
};

export const getVersionsByAssetId = async (
  assetId: string,
): Promise<AssetVersion[]> => {
  return await db
    .select()
    .from(assetVersions)
    .where(eq(assetVersions.assetId, assetId))
    .orderBy(desc(assetVersions.version));
};

export const getLatestVersion = async (
  assetId: string,
): Promise<AssetVersion | null> => {
  const [version] = await db
    .select()
    .from(assetVersions)
    .where(eq(assetVersions.assetId, assetId))
    .orderBy(desc(assetVersions.version))
    .limit(1);
  return version || null;
};

export const updateAssetCurrentVersion = async (
  assetId: string,
  versionId: string,
): Promise<boolean> => {
  const result = await db
    .update(assets)
    .set({ currentVersionId: versionId, updatedAt: new Date() })
    .where(eq(assets.id, assetId));
  return result.rowCount > 0;
};

