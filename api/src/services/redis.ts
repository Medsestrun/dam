import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://redis:6379/0";

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

export const enqueueRenderJob = async (versionId: string): Promise<void> => {
  await connectRedis();
  await redisClient.lPush("queue:preview", JSON.stringify({ versionId }));
};

