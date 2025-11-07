import { Hono } from "hono";
import { z } from "zod";
import {
  createUploadSession,
  getUploadSessionById,
  updateUploadSession,
  markUploadComplete,
  markUploadAborted,
} from "../db/dao/uploads";
import {
  createVersion,
  getLatestVersion,
  updateAssetCurrentVersion,
} from "../db/dao/versions";
import { createAsset } from "../db/dao/assets";
import {
  createMultipartUpload,
  getUploadPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  copyObject,
} from "../services/s3";
import { enqueueRenderJob } from "../services/redis";
import crypto from "crypto";

const uploads = new Hono();

const initUploadSchema = z.object({
  target: z.enum(["new_asset", "new_version"]),
  assetId: z.string().uuid().optional(),
  fileName: z.string().min(1).max(500),
  mime: z.string().min(1).max(255),
  totalSize: z.number().int().positive(),
});

const partRequestSchema = z.object({
  partNumber: z.number().int().min(1).max(10000),
});

const completeUploadSchema = z.object({
  parts: z.array(
    z.object({
      partNumber: z.number().int().min(1),
      etag: z.string(),
    }),
  ),
  sha256: z.string().optional(),
});

// POST /uploads - Initialize upload
uploads.post("/", async (c) => {
  const body = await c.req.json();
  const validated = initUploadSchema.parse(body);

  const partSize = 5 * 1024 * 1024; // 5MB parts
  const bucket = process.env.MINIO_BUCKET || "assets";
  const keyTemp = `uploads/${crypto.randomUUID()}/${validated.fileName}`;

  let s3UploadId: string;
  try {
    s3UploadId = await createMultipartUpload(keyTemp, validated.mime);
  } catch (error) {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.1",
        title: "Bad Request",
        status: 400,
        detail: `Failed to initialize upload: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      400,
    );
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

  const session = await createUploadSession({
    target: validated.target,
    assetId: validated.assetId,
    fileName: validated.fileName,
    mime: validated.mime,
    totalSize: validated.totalSize,
    partSize,
    s3UploadId,
    bucket,
    keyTemp,
    createdBy: "00000000-0000-0000-0000-000000000000", // MVP: fixed user ID
    expiresAt,
  });

  return c.json({
    uploadId: session.id,
    partSize,
    bucket,
    key: keyTemp,
  });
});

// POST /uploads/:id/parts - Get presigned URL for part
uploads.post("/:id/parts", async (c) => {
  const uploadId = c.req.param("id");
  const body = await c.req.json();
  const { partNumber } = partRequestSchema.parse(body);

  const session = await getUploadSessionById(uploadId);
  if (!session) {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.4",
        title: "Not Found",
        status: 404,
        detail: "Upload session not found",
      },
      404,
    );
  }

  // MVP: No auth check

  if (session.state !== "initiated" && session.state !== "uploading") {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.1",
        title: "Bad Request",
        status: 400,
        detail: `Upload session is in ${session.state} state`,
      },
      400,
    );
  }

  if (session.state === "initiated") {
    await updateUploadSession(uploadId, { state: "uploading" });
  }

  try {
    const url = await getUploadPartUrl(
      session.keyTemp,
      session.s3UploadId!,
      partNumber,
    );
    return c.json({ url, partNumber });
  } catch (error) {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.1",
        title: "Bad Request",
        status: 400,
        detail: `Failed to generate presigned URL: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      400,
    );
  }
});

// POST /uploads/:id/complete - Complete multipart upload
uploads.post("/:id/complete", async (c) => {
  const uploadId = c.req.param("id");
  const body = await c.req.json();
  const validated = completeUploadSchema.parse(body);

  const session = await getUploadSessionById(uploadId);
  if (!session) {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.4",
        title: "Not Found",
        status: 404,
        detail: "Upload session not found",
      },
      404,
    );
  }

  // MVP: No auth check

  if (session.state === "completed") {
    // Idempotency: return existing result
    return c.json({
      assetId: session.assetId || "",
      versionId: "",
    });
  }

  if (session.state !== "uploading") {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.1",
        title: "Bad Request",
        status: 400,
        detail: `Upload session is in ${session.state} state`,
      },
      400,
    );
  }

  try {
    const parts = validated.parts.map((p) => ({
      PartNumber: p.partNumber,
      ETag: p.etag,
    }));

    await completeMultipartUpload(
      session.keyTemp,
      session.s3UploadId!,
      parts,
    );

    // Move from temp to final location
    const finalKey = `assets/${crypto.randomUUID()}/${session.fileName}`;
    await copyObject(session.keyTemp, finalKey);

    // Determine asset type from mime
    const mimeToType = (mime: string): "image" | "video" | "audio" | "pdf" | "doc" | "xls" | "ppt" | "other" => {
      if (mime.startsWith("image/")) return "image";
      if (mime.startsWith("video/")) return "video";
      if (mime.startsWith("audio/")) return "audio";
      if (mime === "application/pdf") return "pdf";
      if (mime.includes("wordprocessingml") || mime.includes("msword") || mime.includes("opendocument.text")) return "doc";
      if (mime.includes("spreadsheetml") || mime.includes("ms-excel") || mime.includes("opendocument.spreadsheet")) return "xls";
      if (mime.includes("presentationml") || mime.includes("ms-powerpoint") || mime.includes("opendocument.presentation")) return "ppt";
      return "other";
    };

    let assetId = session.assetId;
    let versionNumber = 1;

    if (session.target === "new_asset") {
      const asset = await createAsset({
        title: session.fileName,
        type: mimeToType(session.mime),
        createdBy: "00000000-0000-0000-0000-000000000000", // MVP: fixed user ID
      });
      assetId = asset.id;
    } else if (session.assetId) {
      const latest = await getLatestVersion(session.assetId);
      versionNumber = latest ? latest.version + 1 : 1;
    }

    const version = await createVersion({
      assetId: assetId!,
      version: versionNumber,
      bucket: session.bucket,
      key: finalKey,
      size: session.totalSize,
      sha256: validated.sha256,
      mime: session.mime,
      createdBy: "00000000-0000-0000-0000-000000000000", // MVP: fixed user ID
    });

    if (session.target === "new_asset") {
      await updateAssetCurrentVersion(assetId!, version.id);
    }

    await markUploadComplete(uploadId);
    await updateUploadSession(uploadId, {
      receivedBytes: session.totalSize,
    });

    // Enqueue render job
    await enqueueRenderJob(version.id);

    return c.json({
      assetId: assetId!,
      versionId: version.id,
    });
  } catch (error) {
    console.error("Complete upload error:", error);
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.1",
        title: "Bad Request",
        status: 400,
        detail: `Failed to complete upload: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      400,
    );
  }
});

// POST /uploads/:id/abort - Abort upload
uploads.post("/:id/abort", async (c) => {
  const uploadId = c.req.param("id");

  const session = await getUploadSessionById(uploadId);
  if (!session) {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.4",
        title: "Not Found",
        status: 404,
        detail: "Upload session not found",
      },
      404,
    );
  }

  // MVP: No auth check

  if (session.s3UploadId) {
    try {
      await abortMultipartUpload(session.keyTemp, session.s3UploadId);
    } catch (error) {
      console.error("Abort upload error:", error);
    }
  }

  await markUploadAborted(uploadId);

  return c.body(null, 204);
});

export default uploads;

