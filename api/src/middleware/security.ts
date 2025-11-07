import { Context, Next } from "hono";
import { validateMimeType } from "../utils/mime";

export const mimeValidationMiddleware = async (
  c: Context,
  next: Next,
): Promise<Response | void> => {
  if (c.req.method === "POST" && c.req.path === "/uploads") {
    try {
      const body = await c.req.json();
      const fileName = body.fileName || "";
      const mime = body.mime || "";

      if (!validateMimeType(mime, fileName)) {
        return c.json(
          {
            type: "https://tools.ietf.org/html/rfc7231#section-6.5.1",
            title: "Bad Request",
            status: 400,
            detail: `File type not allowed: ${mime}`,
          },
          400,
        );
      }

    } catch {
      // If JSON parsing fails, let the route handler deal with it
    }
  }

  await next();
};

