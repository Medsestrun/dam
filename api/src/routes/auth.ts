import { Hono } from "hono";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "crypto";

const auth = new Hono();

const jwtSecret = process.env.JWT_SECRET || "your-secret-key";

const loginSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().optional(),
});

// POST /auth/login - Simple login endpoint for development
// In production, this should validate credentials against a database
auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const validated = loginSchema.parse(body);

  // For development: generate a token without password validation
  // In production, validate credentials here
  const user = {
    id: crypto.randomUUID(),
    email: validated.email || "dev@example.com",
    role: "user",
  };

  const token = jwt.sign(user, jwtSecret, { expiresIn: "7d" });

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});

// POST /auth/token - Quick token generation for development
auth.post("/token", async (c) => {
  const user = {
    id: crypto.randomUUID(),
    email: "dev@example.com",
    role: "user",
  };

  const token = jwt.sign(user, jwtSecret, { expiresIn: "7d" });

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});

export default auth;

