import { Hono } from "hono";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { mimeValidationMiddleware } from "./middleware/security";
import uploads from "./routes/uploads";
import assets from "./routes/assets";
import renditions from "./routes/renditions";
import annotations from "./routes/annotations";
import comments from "./routes/comments";

const app = new Hono();

// Simple CORS middleware
app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }
  await next();
});

// Simple logger middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.path} - ${c.res.status} (${ms}ms)`);
});

// Security middleware
app.use("/uploads", mimeValidationMiddleware);

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.route("/uploads", uploads);
app.route("/assets", assets);
app.route("/renditions", renditions);
app.route("/annotations", annotations);
app.route("/comments", comments);

app.notFound(notFoundHandler);
app.onError(errorHandler);

const port = Number(process.env.PORT || "8787");

console.log(`Server starting on port ${port}`);

Bun.serve({
  port,
  fetch: app.fetch,
});

