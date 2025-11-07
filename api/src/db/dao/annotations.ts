import { eq, and } from "drizzle-orm";
import { db } from "../index";
import { annotations, commentThreads, type Annotation } from "../schema";

export type CreateAnnotationInput = {
  versionId: string;
  page?: number;
  kind: "pin" | "rect" | "arrow" | "highlight" | "text";
  payload: Record<string, unknown>;
  authorId: string;
  threadId?: string;
};

export const createAnnotation = async (
  input: CreateAnnotationInput,
): Promise<Annotation> => {
  const [annotation] = await db
    .insert(annotations)
    .values(input)
    .returning();
  return annotation;
};

export const getAnnotationsByVersionId = async (
  versionId: string,
  page?: number,
): Promise<Annotation[]> => {
  const conditions = [eq(annotations.versionId, versionId)];
  if (page !== undefined) {
    conditions.push(eq(annotations.page, page));
  }
  return await db
    .select()
    .from(annotations)
    .where(and(...conditions));
};

export const updateAnnotation = async (
  id: string,
  updates: Partial<Pick<Annotation, "payload" | "resolvedAt">>,
): Promise<Annotation | null> => {
  const [updated] = await db
    .update(annotations)
    .set(updates)
    .where(eq(annotations.id, id))
    .returning();
  return updated || null;
};

export const deleteAnnotation = async (id: string): Promise<boolean> => {
  const result = await db.delete(annotations).where(eq(annotations.id, id));
  return result.rowCount > 0;
};

