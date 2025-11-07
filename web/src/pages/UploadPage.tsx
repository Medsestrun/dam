import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "../lib/api";
import { toast } from "../components/ui/toaster";
import { Upload as UploadIcon, X, File as FileIcon } from "lucide-react";

interface UploadFile {
  file: File;
  uploadId?: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

const PART_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CONCURRENT_PARTS = 6;

const UploadPage = () => {
  const [files, setFiles] = useState<UploadFile[]>([]);

  const uploadFile = useCallback(async (uploadFile: UploadFile) => {
    try {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === uploadFile.file ? { ...f, status: "uploading" } : f,
        ),
      );

      // Initialize upload
      const initResult = await api.uploads.init({
        target: "new_asset",
        fileName: uploadFile.file.name,
        mime: uploadFile.file.type || "application/octet-stream",
        totalSize: uploadFile.file.size,
      });

      const uploadId = initResult.uploadId;
      const partSize = initResult.partSize;
      const totalParts = Math.ceil(uploadFile.file.size / partSize);

      setFiles((prev) =>
        prev.map((f) =>
          f.file === uploadFile.file ? { ...f, uploadId } : f,
        ),
      );

      // Upload parts
      const parts: Array<{ partNumber: number; etag: string }> = [];
      const uploadPromises: Promise<void>[] = [];

      const uploadPart = async (partNumber: number): Promise<void> => {
        const start = (partNumber - 1) * partSize;
        const end = Math.min(start + partSize, uploadFile.file.size);
        const blob = uploadFile.file.slice(start, end);

        const { url } = await api.uploads.getPartUrl(uploadId, partNumber);

        const response = await fetch(url, {
          method: "PUT",
          body: blob,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload part ${partNumber}`);
        }

        const etag = response.headers.get("etag") || "";
        parts.push({ partNumber, etag });

        const uploadedBytes = Math.min(end, uploadFile.file.size);
        const progress = Math.round((uploadedBytes / uploadFile.file.size) * 100);

        setFiles((prev) =>
          prev.map((f) =>
            f.file === uploadFile.file ? { ...f, progress } : f,
          ),
        );
      };

      // Upload parts with concurrency limit
      for (let i = 0; i < totalParts; i += MAX_CONCURRENT_PARTS) {
        const batch = Array.from(
          { length: Math.min(MAX_CONCURRENT_PARTS, totalParts - i) },
          (_, j) => uploadPart(i + j + 1),
        );
        await Promise.all(batch);
      }

      // Complete upload
      await api.uploads.complete(uploadId, { parts });

      setFiles((prev) =>
        prev.map((f) =>
          f.file === uploadFile.file
            ? { ...f, status: "completed", progress: 100 }
            : f,
        ),
      );

      toast("File uploaded successfully", "success");
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === uploadFile.file
            ? {
                ...f,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : f,
        ),
      );
      toast(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      // Start uploading each file
      newFiles.forEach((fileItem) => {
        uploadFile(fileItem);
      });
    },
    [uploadFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false,
  });

  const removeFile = (file: File) => {
    setFiles((prev) => prev.filter((f) => f.file !== file));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Files</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload and manage your digital assets
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? "border-blue-500 bg-blue-50/50 shadow-lg scale-[1.02]"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50/50 bg-white shadow-sm"
        }`}
        aria-label="Upload area"
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <div
            className={`p-4 rounded-full mb-4 transition-colors ${
              isDragActive ? "bg-blue-100" : "bg-gray-100"
            }`}
          >
            <UploadIcon
              className={`h-10 w-10 transition-colors ${
                isDragActive ? "text-blue-600" : "text-gray-400"
              }`}
            />
          </div>
          <p
            className={`text-base font-medium transition-colors ${
              isDragActive ? "text-blue-700" : "text-gray-700"
            }`}
          >
            {isDragActive
              ? "Drop files here to upload"
              : "Drag and drop files here, or click to select"}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Supports images, videos, documents, and more
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Upload Queue</h2>
          <div className="space-y-3">
            {files.map((uploadFile) => (
              <div
                key={uploadFile.file.name}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <FileIcon className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 block truncate">
                        {uploadFile.file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(uploadFile.file)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                    aria-label={`Remove ${uploadFile.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      uploadFile.status === "completed"
                        ? "bg-green-500"
                        : uploadFile.status === "error"
                          ? "bg-red-500"
                          : "bg-gradient-to-r from-blue-500 to-blue-600"
                    }`}
                    style={{ width: `${uploadFile.progress}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${
                      uploadFile.status === "completed"
                        ? "text-green-600"
                        : uploadFile.status === "error"
                          ? "text-red-600"
                          : "text-blue-600"
                    }`}
                  >
                    {uploadFile.status === "completed" && "✓ Completed"}
                    {uploadFile.status === "uploading" &&
                      `Uploading... ${uploadFile.progress}%`}
                    {uploadFile.status === "error" && `✗ ${uploadFile.error}`}
                    {uploadFile.status === "pending" && "Pending..."}
                  </span>
                  {uploadFile.status === "uploading" && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;

