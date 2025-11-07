import { eq } from "drizzle-orm";
import { db } from "../index";
import { renditions, type Rendition } from "../schema";

export type CreateRenditionInput = {
  assetVersionId: string;
  kind: "thumb" | "preview" | "page" | "tile" | "webp";
  bucket: string;
  key: string;
  width?: number;
  height?: number;
  page?: number;
  ready?: boolean;
};

export const createRendition = async (
  input: CreateRenditionInput,
): Promise<Rendition> => {
  const [rendition] = await db
    .insert(renditions)
    .values({
      ...input,
      ready: input.ready || false,
    })
    .returning();
  return rendition;
};

export const getRenditionsByVersionId = async (
  versionId: string,
): Promise<Rendition[]> => {
  return await db
    .select()
    .from(renditions)
    .where(eq(renditions.assetVersionId, versionId));
};

export const markRenditionReady = async (id: string): Promise<boolean> => {
  const result = await db
    .update(renditions)
    .set({ ready: true })
    .where(eq(renditions.id, id));
  return result.rowCount > 0;
};

