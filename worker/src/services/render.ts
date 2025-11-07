import { $ } from "bun";
import sharp from "sharp";
import { createRendition, markRenditionReady } from "../db/dao/renditions";
import { uploadToS3 } from "./s3";
import type { AssetVersion } from "../db/schema";
import crypto from "crypto";

const bucket = process.env.MINIO_BUCKET || "assets";

export const renderPDF = async (
  version: AssetVersion,
  pdfPath: string,
  bucket: string,
): Promise<void> => {
  // Validate file exists and is not empty
  const file = Bun.file(pdfPath);
  if (!(await file.exists())) {
    throw new Error(`PDF file not found: ${pdfPath}`);
  }

  const fileSize = file.size;
  if (fileSize === 0) {
    throw new Error(
      `Empty PDF file for version ${version.id}. ` +
      `S3 key: ${version.key}, MIME: ${version.mime}. ` +
      `The file may not exist in S3 or the download failed.`
    );
  }

  // Get page count using pdfinfo (poppler-utils)
  try {
    let infoResult;
    try {
      infoResult = await $`pdfinfo ${pdfPath}`.quiet();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("command not found") || errorMessage.includes("pdfinfo")) {
        throw new Error(
          `pdfinfo command not found. Please install poppler-utils: ` +
          `brew install poppler (macOS) or apt-get install poppler-utils (Linux). ` +
          `In Docker, poppler-utils should already be installed.`
        );
      }
      throw error;
    }

    const infoOutput = infoResult.stdout.toString();
    const pagesMatch = infoOutput.match(/Pages:\s+(\d+)/);
    const pageCount = pagesMatch ? Number(pagesMatch[1]) : 1;

    // Generate thumbnails and page previews
    const widths = [512, 1024, 2048];

    for (let page = 1; page <= pageCount; page++) {
      for (const width of widths) {
        const outputBase = `/tmp/${version.id}-page-${page}-${width}`;
        const outputPath = `${outputBase}.png`;

        // Convert PDF page to PNG using pdftoppm (poppler-utils)
        try {
          await $`pdftoppm -png -f ${page} -l ${page} -scale-to-x ${width} ${pdfPath} ${outputBase}`.quiet();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("command not found") || errorMessage.includes("pdftoppm")) {
            throw new Error(
              `pdftoppm command not found. Please install poppler-utils: ` +
              `brew install poppler (macOS) or apt-get install poppler-utils (Linux). ` +
              `In Docker, poppler-utils should already be installed.`
            );
          }
          throw error;
        }

        if (await Bun.file(outputPath).exists()) {
          const imageBuffer = await Bun.file(outputPath).arrayBuffer();
          const metadata = await sharp(Buffer.from(imageBuffer)).metadata();

          const key = `renditions/${version.id}/page-${page}-${width}.png`;
          await uploadToS3(key, outputPath, "image/png");

          const rendition = await createRendition({
            assetVersionId: version.id,
            kind: width === 512 ? "thumb" : "page",
            bucket,
            key,
            width: metadata.width,
            height: metadata.height,
            page,
            ready: true,
          });

          await markRenditionReady(rendition.id);
        }
      }
    }
  } catch (error) {
    console.error(`Error rendering PDF ${version.id}:`, error);
    throw error;
  }
};

export const renderImage = async (
  version: AssetVersion,
  imagePath: string,
  bucket: string,
): Promise<void> => {
  // Validate file exists and is readable
  const file = Bun.file(imagePath);
  if (!(await file.exists())) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  // Check file size - empty files indicate download failure
  const fileSize = file.size;
  if (fileSize === 0) {
    throw new Error(
      `Empty file downloaded for version ${version.id}. ` +
      `S3 key: ${version.key}, MIME: ${version.mime}. ` +
      `The file may not exist in S3 or the download failed.`
    );
  }

  // Try to create Sharp instance and validate format
  let image: sharp.Sharp;
  let metadata: sharp.Metadata;
  
  try {
    image = sharp(imagePath);
    metadata = await image.metadata();
  } catch (error) {
    // Check if it's a format error
    if (error instanceof Error && error.message.includes("unsupported image format")) {
      // Try to detect actual format from file buffer
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer.slice(0, 12));
      
      // Log for debugging
      console.error(`Unsupported image format for version ${version.id}. MIME: ${version.mime}, File size: ${buffer.byteLength} bytes`);
      console.error(`First 12 bytes: ${Array.from(bytes).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')}`);
      
      throw new Error(`Unsupported image format for version ${version.id}. MIME type: ${version.mime}. Sharp cannot process this file format.`);
    }
    throw error;
  }

  // Validate metadata was retrieved
  if (!metadata || !metadata.width || !metadata.height) {
    throw new Error(`Invalid image metadata for version ${version.id}. Could not determine dimensions.`);
  }

  // Generate thumbnail
  const thumbBuffer = await image.resize(512, 512, { fit: "inside" }).toBuffer();
  const thumbKey = `renditions/${version.id}/thumb-512.webp`;
  await Bun.write(`/tmp/${version.id}-thumb.webp`, thumbBuffer);
  await uploadToS3(thumbKey, `/tmp/${version.id}-thumb.webp`, "image/webp");

  const thumbRendition = await createRendition({
    assetVersionId: version.id,
    kind: "thumb",
    bucket,
    key: thumbKey,
    width: 512,
    height: metadata.height ? Math.round((512 * metadata.height) / (metadata.width || 512)) : 512,
    ready: true,
  });
  await markRenditionReady(thumbRendition.id);

  // Generate preview sizes
  const previewSizes = [1024, 2048];
  for (const size of previewSizes) {
    const previewBuffer = await image
      .resize(size, size, { fit: "inside" })
      .webp()
      .toBuffer();
    const previewKey = `renditions/${version.id}/preview-${size}.webp`;
    await Bun.write(`/tmp/${version.id}-preview-${size}.webp`, previewBuffer);
    await uploadToS3(previewKey, `/tmp/${version.id}-preview-${size}.webp`, "image/webp");

    const previewRendition = await createRendition({
      assetVersionId: version.id,
      kind: "preview",
      bucket,
      key: previewKey,
      width: size,
      height: metadata.height ? Math.round((size * metadata.height) / (metadata.width || size)) : size,
      ready: true,
    });
    await markRenditionReady(previewRendition.id);
  }

  // Generate DeepZoom tiles (simplified - full implementation would use dzi format)
  // For MVP, we'll generate a few zoom levels
  const tileSize = 256;
  const maxZoom = Math.ceil(Math.log2(Math.max(metadata.width || 1024, metadata.height || 1024) / tileSize));

  for (let zoom = 0; zoom <= Math.min(maxZoom, 4); zoom++) {
    const scale = Math.pow(2, zoom);
    const scaledWidth = Math.ceil((metadata.width || 1024) / scale);
    const scaledHeight = Math.ceil((metadata.height || 1024) / scale);

    // Ensure minimum dimensions
    if (scaledWidth <= 0 || scaledHeight <= 0) {
      console.warn(`Skipping zoom level ${zoom} - invalid dimensions: ${scaledWidth}x${scaledHeight}`);
      continue;
    }

    const tilesX = Math.ceil(scaledWidth / tileSize);
    const tilesY = Math.ceil(scaledHeight / tileSize);

    // Create resized image once per zoom level
    const resizedImage = image.resize(scaledWidth, scaledHeight);

    for (let tx = 0; tx < tilesX; tx++) {
      for (let ty = 0; ty < tilesY; ty++) {
        const left = tx * tileSize;
        const top = ty * tileSize;
        const width = Math.min(tileSize, scaledWidth - left);
        const height = Math.min(tileSize, scaledHeight - top);

        // Validate extract area bounds
        if (left >= scaledWidth || top >= scaledHeight || width <= 0 || height <= 0) {
          console.warn(
            `Skipping tile ${zoom}/${tx}_${ty} - invalid extract area: ` +
            `left=${left}, top=${top}, width=${width}, height=${height}, ` +
            `imageSize=${scaledWidth}x${scaledHeight}`
          );
          continue;
        }

        // Ensure extract area doesn't exceed image bounds
        if (left + width > scaledWidth || top + height > scaledHeight) {
          console.warn(
            `Skipping tile ${zoom}/${tx}_${ty} - extract area exceeds bounds: ` +
            `left=${left}, top=${top}, width=${width}, height=${height}, ` +
            `imageSize=${scaledWidth}x${scaledHeight}`
          );
          continue;
        }

        try {
          const tileBuffer = await resizedImage
            .clone()
            .extract({
              left,
              top,
              width,
              height,
            })
            .webp()
            .toBuffer();

          const tileKey = `renditions/${version.id}/tiles/${zoom}/${tx}_${ty}.webp`;
          await Bun.write(`/tmp/${version.id}-tile-${zoom}-${tx}-${ty}.webp`, tileBuffer);
          await uploadToS3(tileKey, `/tmp/${version.id}-tile-${zoom}-${tx}-${ty}.webp`, "image/webp");

          const tileRendition = await createRendition({
            assetVersionId: version.id,
            kind: "tile",
            bucket,
            key: tileKey,
            width,
            height,
            ready: true,
          });
          await markRenditionReady(tileRendition.id);
        } catch (error) {
          console.error(
            `Error generating tile ${zoom}/${tx}_${ty} for version ${version.id}:`,
            error instanceof Error ? error.message : error
          );
          // Continue with next tile instead of failing entire job
        }
      }
    }
  }
};

export const convertOfficeToPDF = async (
  filePath: string,
  mimeType: string,
): Promise<string> => {
  const outputDir = "/tmp";
  const outputPath = `${outputDir}/${crypto.randomUUID()}.pdf`;

  // Use LibreOffice headless to convert
  try {
    await $`libreoffice --headless --convert-to pdf --outdir ${outputDir} ${filePath}`.quiet();

    // LibreOffice outputs to same directory with .pdf extension
    const convertedPath = filePath.replace(/\.[^.]+$/, ".pdf");
    
    // If conversion didn't work, try alternative approach
    if (await Bun.file(convertedPath).exists()) {
      return convertedPath;
    }

    throw new Error(`Failed to convert ${mimeType} to PDF`);
  } catch (error) {
    console.error(`Error converting ${mimeType} to PDF:`, error);
    throw error;
  }
};

