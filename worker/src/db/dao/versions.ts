import { eq } from "drizzle-orm";
import { db } from "../index";
import { assetVersions, type AssetVersion } from "../schema";

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

