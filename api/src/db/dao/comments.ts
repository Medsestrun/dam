import { eq, desc } from "drizzle-orm";
import { db } from "../index";
import { commentThreads, comments, type CommentThread, type Comment } from "../schema";

export type CreateThreadInput = {
  versionId: string;
  page?: number;
  createdBy: string;
};

export const createThread = async (
  input: CreateThreadInput,
): Promise<CommentThread> => {
  const [thread] = await db
    .insert(commentThreads)
    .values({
      ...input,
      status: "open",
    })
    .returning();
  return thread;
};

export const getThreadsByVersionId = async (
  versionId: string,
): Promise<CommentThread[]> => {
  return await db
    .select()
    .from(commentThreads)
    .where(eq(commentThreads.versionId, versionId))
    .orderBy(desc(commentThreads.createdAt));
};

export const getThreadById = async (
  id: string,
): Promise<CommentThread | null> => {
  const [thread] = await db
    .select()
    .from(commentThreads)
    .where(eq(commentThreads.id, id))
    .limit(1);
  return thread || null;
};

export const updateThreadStatus = async (
  id: string,
  status: "open" | "resolved",
): Promise<boolean> => {
  const result = await db
    .update(commentThreads)
    .set({ status })
    .where(eq(commentThreads.id, id));
  return result.rowCount > 0;
};

export type CreateCommentInput = {
  threadId: string;
  authorId: string;
  body: string;
};

export const createComment = async (
  input: CreateCommentInput,
): Promise<Comment> => {
  const [comment] = await db.insert(comments).values(input).returning();
  return comment;
};

export const getCommentsByThreadId = async (
  threadId: string,
): Promise<Comment[]> => {
  return await db
    .select()
    .from(comments)
    .where(eq(comments.threadId, threadId))
    .orderBy(desc(comments.createdAt));
};

