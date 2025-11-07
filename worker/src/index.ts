import { createClient } from "redis";
import { getVersionById } from "./db/dao/versions";
import { createRendition, markRenditionReady } from "./db/dao/renditions";
import {
  downloadFromS3,
  uploadToS3,
} from "./services/s3";
import { renderPDF, renderImage, convertOfficeToPDF } from "./services/render";

const redisUrl = process.env.REDIS_URL || "redis://redis:6379/0";
const redisClient = createClient({ url: redisUrl });

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

const processJob = async (jobData: { versionId: string }) => {
  const { versionId } = jobData;
  console.log(`Processing render job for version ${versionId}`);

  try {
    const version = await getVersionById(versionId);
    if (!version) {
      console.error(`Version ${versionId} not found`);
      return;
    }

    const mime = version.mime.toLowerCase();
    const bucket = process.env.MINIO_BUCKET || "assets";

    // Download original file
    const tempPath = `/tmp/${versionId}`;
    await downloadFromS3(version.key, tempPath);

    // Validate file was downloaded successfully
    const downloadedFile = Bun.file(tempPath);
    if (!(await downloadedFile.exists())) {
      throw new Error(`Failed to download file from S3. Key: ${version.key}`);
    }

    const fileSize = downloadedFile.size;
    if (fileSize === 0) {
      throw new Error(
        `Empty file downloaded from S3 for version ${versionId}. ` +
        `S3 key: ${version.key}, MIME: ${version.mime}. ` +
        `The file may not exist in S3 or the download failed.`
      );
    }

    console.log(`Downloaded file: ${version.key}, size: ${fileSize} bytes, MIME: ${version.mime}`);

    // Determine file type and process
    if (mime === "application/pdf") {
      await renderPDF(version, tempPath, bucket);
    } else if (mime.startsWith("image/")) {
      await renderImage(version, tempPath, bucket);
    } else if (
      mime.includes("wordprocessingml") ||
      mime.includes("msword") ||
      mime.includes("spreadsheetml") ||
      mime.includes("ms-excel") ||
      mime.includes("presentationml") ||
      mime.includes("ms-powerpoint") ||
      mime.includes("opendocument")
    ) {
      // Convert Office to PDF first
      const pdfPath = await convertOfficeToPDF(tempPath, version.mime);
      // Update version mime temporarily for rendering
      const pdfVersion = { ...version, mime: "application/pdf" };
      await renderPDF(pdfVersion, pdfPath, bucket);
    } else {
      console.log(`Unsupported mime type: ${mime}`);
    }

    console.log(`Completed render job for version ${versionId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`Error processing job ${versionId}:`, errorMessage);
    if (errorStack) {
      console.error(`Stack trace:`, errorStack);
    }
    
    // Push to DLQ
    await redisClient.lPush(
      "queue:preview:dlq",
      JSON.stringify({ 
        versionId, 
        error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString() 
      }),
    );
  }
};

const main = async () => {
  await redisClient.connect();
  console.log("Worker started, waiting for jobs...");

  while (true) {
    try {
      const result = await redisClient.brPop("queue:preview", 5);
      if (result) {
        const jobData = JSON.parse(result.element);
        await processJob(jobData);
      }
    } catch (error) {
      console.error("Error in main loop:", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
};

main().catch(console.error);

