import { Context } from "hono";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export const errorHandler = (error: Error, c: Context): Response => {
  console.error("Error:", error);

  const problem: ProblemDetails = {
    type: "https://tools.ietf.org/html/rfc7231#section-6.6.1",
    title: "Internal Server Error",
    status: 500,
    detail: error.message,
    instance: c.req.path,
  };

  return c.json(problem, 500);
};

export const notFoundHandler = (c: Context): Response => {
  const problem: ProblemDetails = {
    type: "https://tools.ietf.org/html/rfc7231#section-6.5.4",
    title: "Not Found",
    status: 404,
    detail: `The requested resource ${c.req.path} was not found`,
    instance: c.req.path,
  };

  return c.json(problem, 404);
};

