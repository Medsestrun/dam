import { Hono } from "hono";
import { getRenditionsByVersionId } from "../db/dao/renditions";
import { getPresignedGetUrl } from "../services/s3";

const renditions = new Hono();

// GET /renditions/:versionId - Get renditions for version
renditions.get("/:versionId", async (c) => {
  const versionId = c.req.param("versionId");
  const renditionsList = await getRenditionsByVersionId(versionId);

  const renditionsWithUrls = await Promise.all(
    renditionsList.map(async (r) => {
      const url = r.ready ? await getPresignedGetUrl(r.key) : null;
      return {
        id: r.id,
        kind: r.kind,
        page: r.page,
        width: r.width,
        height: r.height,
        url,
        ready: r.ready,
        createdAt: r.createdAt,
      };
    }),
  );

  return c.json(renditionsWithUrls);
});

export default renditions;

