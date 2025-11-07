import { eq, lt } from "drizzle-orm";
import { db } from "../index";
import { uploadSessions, type UploadSession } from "../schema";

export type CreateUploadSessionInput = {
  target: "new_asset" | "new_version";
  assetId?: string;
  fileName: string;
  mime: string;
  totalSize: number;
  partSize: number;
  s3UploadId?: string;
  bucket: string;
  keyTemp: string;
  createdBy: string;
  expiresAt: Date;
};

export const createUploadSession = async (
  input: CreateUploadSessionInput,
): Promise<UploadSession> => {
  const [session] = await db
    .insert(uploadSessions)
    .values({
      ...input,
      state: "initiated",
      receivedBytes: 0,
    })
    .returning();
  return session;
};

export const getUploadSessionById = async (
  id: string,
): Promise<UploadSession | null> => {
  const [session] = await db
    .select()
    .from(uploadSessions)
    .where(eq(uploadSessions.id, id))
    .limit(1);
  return session || null;
};

export const updateUploadSession = async (
  id: string,
  updates: Partial<Pick<UploadSession, "state" | "receivedBytes" | "s3UploadId">>,
): Promise<UploadSession | null> => {
  const [updated] = await db
    .update(uploadSessions)
    .set(updates)
    .where(eq(uploadSessions.id, id))
    .returning();
  return updated || null;
};

export const markUploadComplete = async (id: string): Promise<boolean> => {
  const result = await db
    .update(uploadSessions)
    .set({ state: "completed" })
    .where(eq(uploadSessions.id, id))
    .returning();
  return result.length > 0;
};

export const markUploadAborted = async (id: string): Promise<boolean> => {
  const result = await db
    .update(uploadSessions)
    .set({ state: "aborted" })
    .where(eq(uploadSessions.id, id))
    .returning();
  return result.length > 0;
};

export const cleanupExpiredSessions = async (): Promise<number> => {
  const result = await db
    .delete(uploadSessions)
    .where(lt(uploadSessions.expiresAt, new Date()))
    .returning();
  return result.length;
};

