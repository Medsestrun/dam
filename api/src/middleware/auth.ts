import { Context, Next } from "hono";
import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET || "your-secret-key";

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthUser;
    c.set("user", decoded);
    await next();
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
};

export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, jwtSecret) as AuthUser;
      c.set("user", decoded);
    } catch {
      // Ignore invalid tokens in optional auth
    }
  }
  await next();
};

