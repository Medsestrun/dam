// MIME type validation and detection
const ALLOWED_MIME_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/tiff",
  "image/bmp",
  // PDF
  "application/pdf",
  // Office documents
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/msword", // .doc
  "application/vnd.ms-excel", // .xls
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.oasis.opendocument.text", // .odt
  "application/vnd.oasis.opendocument.spreadsheet", // .ods
  "application/vnd.oasis.opendocument.presentation", // .odp
  // Video
  "video/mp4",
  "video/webm",
  "video/ogg",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
];

const BLOCKED_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".scr",
  ".vbs",
  ".js",
  ".jar",
  ".app",
  ".dmg",
  ".pkg",
  ".deb",
  ".rpm",
  ".sh",
];

export const validateMimeType = (mimeType: string, fileName: string): boolean => {
  // Check extension
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return false;
  }

  // Check MIME type (allow if in whitelist or if it's a known safe pattern)
  if (ALLOWED_MIME_TYPES.includes(mimeType)) {
    return true;
  }

  // Allow image/* and video/* and audio/* patterns
  if (
    mimeType.startsWith("image/") ||
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/")
  ) {
    return true;
  }

  return false;
};

// Magic bytes detection (basic implementation)
export const detectMimeTypeFromBuffer = async (
  buffer: ArrayBuffer,
): Promise<string | null> => {
  const bytes = new Uint8Array(buffer.slice(0, 12));

  // PDF
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  // GIF
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif";
  }

  // Office documents (ZIP-based)
  if (
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  ) {
    // Could be .docx, .xlsx, .pptx - would need to check internal structure
    // For MVP, we'll return null and rely on file extension
    return null;
  }

  return null;
};

