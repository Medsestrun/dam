import { Hono } from "hono";
import { z } from "zod";
import {
  getThreadsByVersionId,
  getThreadById,
  updateThreadStatus,
  createComment,
  getCommentsByThreadId,
} from "../db/dao/comments";

const comments = new Hono();

const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
});

// GET /threads - Get threads for version
comments.get("/threads", async (c) => {
  const versionId = c.req.query("versionId");
  if (!versionId) {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.1",
        title: "Bad Request",
        status: 400,
        detail: "versionId is required",
      },
      400,
    );
  }

  const threads = await getThreadsByVersionId(versionId);
  return c.json(threads);
});

// GET /threads/:id/comments - Get comments for thread
comments.get("/threads/:id/comments", async (c) => {
  const threadId = c.req.param("id");
  const commentsList = await getCommentsByThreadId(threadId);
  return c.json(commentsList);
});

// POST /threads/:id/comments - Create comment
comments.post("/threads/:id/comments", async (c) => {
  const threadId = c.req.param("id");
  const body = await c.req.json();
  const { body: commentBody } = createCommentSchema.parse(body);

  const thread = await getThreadById(threadId);
  if (!thread) {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.4",
        title: "Not Found",
        status: 404,
        detail: "Thread not found",
      },
      404,
    );
  }

  const comment = await createComment({
    threadId,
    authorId: "00000000-0000-0000-0000-000000000000", // MVP: fixed user ID
    body: commentBody,
  });

  return c.json({ id: comment.id }, 201);
});

// PATCH /threads/:id/status - Update thread status
comments.patch("/threads/:id/status", async (c) => {
  const threadId = c.req.param("id");
  const body = await c.req.json();

  const statusSchema = z.object({
    status: z.enum(["open", "resolved"]),
  });

  const { status } = statusSchema.parse(body);
  const updated = await updateThreadStatus(threadId, status);

  if (!updated) {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.4",
        title: "Not Found",
        status: 404,
        detail: "Thread not found",
      },
      404,
    );
  }

  return c.json({ status });
});

export default comments;

