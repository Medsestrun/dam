import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
  CopyObjectCommand,
  type CompletedPart,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
const presignTtl = Number(process.env.PRESIGN_TTL_SECONDS || "600");

export const createMultipartUpload = async (
  key: string,
  mimeType: string,
): Promise<string> => {
  const command = new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType,
  });
  const response = await s3Client.send(command);
  if (!response.UploadId) {
    throw new Error("Failed to create multipart upload");
  }
  return response.UploadId;
};

export const getUploadPartUrl = async (
  key: string,
  uploadId: string,
  partNumber: number,
): Promise<string> => {
  const command = new UploadPartCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: presignTtl });
};

export const completeMultipartUpload = async (
  key: string,
  uploadId: string,
  parts: CompletedPart[],
): Promise<string> => {
  const command = new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });
  const response = await s3Client.send(command);
  if (!response.Location && !response.Key) {
    throw new Error("Failed to complete multipart upload");
  }
  return response.Key || key;
};

export const abortMultipartUpload = async (
  key: string,
  uploadId: string,
): Promise<void> => {
  const command = new AbortMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
  });
  await s3Client.send(command);
};

export const getPresignedGetUrl = async (
  key: string,
  expiresIn: number = presignTtl,
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return await getSignedUrl(s3Client, command, { expiresIn });
};

export const copyObject = async (
  sourceKey: string,
  destKey: string,
): Promise<void> => {
  const command = new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${sourceKey}`,
    Key: destKey,
  });
  const response = await s3Client.send(command);
  
  // Verify copy was successful
  if (!response.CopyObjectResult) {
    throw new Error(`Failed to copy object from ${sourceKey} to ${destKey}`);
  }
};

