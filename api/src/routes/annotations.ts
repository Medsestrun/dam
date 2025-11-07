import { Hono } from "hono";
import { z } from "zod";
import {
  createAnnotation,
  getAnnotationsByVersionId,
  updateAnnotation,
  deleteAnnotation,
} from "../db/dao/annotations";
import { createThread } from "../db/dao/comments";

const annotations = new Hono();

const createAnnotationSchema = z.object({
  versionId: z.string().uuid(),
  page: z.number().int().optional(),
  kind: z.enum(["pin", "rect", "arrow", "highlight", "text"]),
  payload: z.record(z.unknown()),
  comment: z.string().optional(),
});

// GET /annotations - Get annotations
annotations.get("/", async (c) => {
  const versionId = c.req.query("versionId");
  const page = c.req.query("page") ? Number(c.req.query("page")) : undefined;

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

  const annotationsList = await getAnnotationsByVersionId(
    versionId,
    page,
  );
  return c.json(annotationsList);
});

// POST /annotations - Create annotation
annotations.post("/", async (c) => {
  const body = await c.req.json();
  const validated = createAnnotationSchema.parse(body);

  let threadId: string | undefined;

  if (validated.comment) {
    const thread = await createThread({
      versionId: validated.versionId,
      page: validated.page,
      createdBy: "00000000-0000-0000-0000-000000000000", // MVP: fixed user ID
    });
    threadId = thread.id;
  }

  const annotation = await createAnnotation({
    versionId: validated.versionId,
    page: validated.page,
    kind: validated.kind,
    payload: validated.payload,
    authorId: "00000000-0000-0000-0000-000000000000", // MVP: fixed user ID
    threadId,
  });

  return c.json({ id: annotation.id, threadId }, 201);
});

// PATCH /annotations/:id - Update annotation
annotations.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateSchema = z.object({
    payload: z.record(z.unknown()).optional(),
    resolved: z.boolean().optional(),
  });

  const validated = updateSchema.parse(body);
  const updates: { payload?: Record<string, unknown>; resolvedAt?: Date | null } = {};

  if (validated.payload) {
    updates.payload = validated.payload;
  }

  if (validated.resolved !== undefined) {
    updates.resolvedAt = validated.resolved ? new Date() : null;
  }

  const updated = await updateAnnotation(id, updates);

  if (!updated) {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.4",
        title: "Not Found",
        status: 404,
        detail: "Annotation not found",
      },
      404,
    );
  }

  return c.json(updated);
});

// DELETE /annotations/:id - Delete annotation
annotations.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const deleted = await deleteAnnotation(id);

  if (!deleted) {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.4",
        title: "Not Found",
        status: 404,
        detail: "Annotation not found",
      },
      404,
    );
  }

  return c.body(null, 204);
});

export default annotations;

