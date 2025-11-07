import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { writeFile, readFile } from "fs/promises";

const endpoint = process.env.MINIO_ENDPOINT || "http://minio:9000";
const region = process.env.S3_REGION || "us-east-1";
const accessKeyId = process.env.MINIO_KEY || "";
const secretAccessKey = process.env.MINIO_SECRET || "";

export const s3Client = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

const bucket = process.env.MINIO_BUCKET || "assets";

export const downloadFromS3 = async (
  key: string,
  localPath: string,
): Promise<void> => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  try {
    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error(`Empty response body from S3. Key: ${key}`);
    }

    const stream = response.Body as Readable;
    const chunks: Uint8Array[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    
    if (buffer.length === 0) {
      throw new Error(
        `Empty file downloaded from S3. Key: ${key}, ` +
        `ContentLength: ${response.ContentLength || 'unknown'}. ` +
        `The file may not exist or is empty in S3.`
      );
    }

    await writeFile(localPath, buffer);
  } catch (error) {
    // Re-throw with more context if it's not already our error
    if (error instanceof Error && error.message.includes("Empty")) {
      throw error;
    }
    // Handle S3 errors (e.g., NoSuchKey)
    if (error instanceof Error) {
      throw new Error(`Failed to download from S3. Key: ${key}, Error: ${error.message}`);
    }
    throw error;
  }
};

export const uploadToS3 = async (
  key: string,
  localPath: string,
  contentType?: string,
): Promise<void> => {
  const fileBuffer = await readFile(localPath);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
};

export const getPresignedGetUrl = async (
  key: string,
  expiresIn: number = 600,
): Promise<string> => {
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};

