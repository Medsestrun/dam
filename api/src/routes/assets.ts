import { Hono } from "hono";
import { z } from "zod";
import {
  getAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
} from "../db/dao/assets";
import { getVersionsByAssetId, getVersionById } from "../db/dao/versions";
import { getRenditionsByVersionId } from "../db/dao/renditions";
import { getPresignedGetUrl } from "../services/s3";

const assets = new Hono();

// GET /assets - List assets with filters
assets.get("/", async (c) => {
  const query = c.req.query("query");
  const type = c.req.query("type");
  const status = c.req.query("status");
  const tags = c.req.query("tags")?.split(",").filter(Boolean);
  const limit = Number(c.req.query("limit") || "50");
  const offset = Number(c.req.query("offset") || "0");

  const result = await getAssets({
    query,
    type,
    status,
    tags,
    limit: Math.min(limit, 100),
    offset,
  });

  return c.json({
    items: result.items,
    total: result.total,
    limit,
    offset,
  });
});

// GET /assets/:id - Get asset details
assets.get("/:id", async (c) => {
  const id = c.req.param("id");
  const asset = await getAssetById(id);

  if (!asset) {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.4",
        title: "Not Found",
        status: 404,
        detail: "Asset not found",
      },
      404,
    );
  }

  return c.json(asset);
});

// GET /assets/:id/versions - Get asset versions
assets.get("/:id/versions", async (c) => {
  const id = c.req.param("id");
  const versions = await getVersionsByAssetId(id);
  return c.json(versions);
});

// GET /download/:versionId - Get presigned download URL
assets.get("/download/:versionId", async (c) => {
  const versionId = c.req.param("versionId");
  const version = await getVersionById(versionId);

  if (!version) {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.4",
        title: "Not Found",
        status: 404,
        detail: "Version not found",
      },
      404,
    );
  }

  // TODO: Add ACL check here
  const url = await getPresignedGetUrl(version.key);

  return c.json({ url, expiresIn: Number(process.env.PRESIGN_TTL_SECONDS || "600") });
});

// PATCH /assets/:id - Update asset
assets.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const updateSchema = z.object({
    title: z.string().max(500).optional(),
    description: z.string().optional(),
    status: z.enum(["draft", "in_review", "approved", "rejected", "archived"]).optional(),
    tags: z.array(z.string()).optional(),
  });

  const validated = updateSchema.parse(body);
  const updated = await updateAsset(id, validated);

  if (!updated) {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.4",
        title: "Not Found",
        status: 404,
        detail: "Asset not found",
      },
      404,
    );
  }

  return c.json(updated);
});

// DELETE /assets/:id - Delete asset
assets.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const deleted = await deleteAsset(id);

  if (!deleted) {
    return c.json(
      {
        type: "https://tools.ietf.org/html/rfc7231#section-6.5.4",
        title: "Not Found",
        status: 404,
        detail: "Asset not found",
      },
      404,
    );
  }

  return c.body(null, 204);
});

export default assets;

