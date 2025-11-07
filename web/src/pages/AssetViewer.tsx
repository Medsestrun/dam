import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useState } from "react";
import PDFViewer from "../components/PDFViewer";
import ImageViewer from "../components/ImageViewer";
import { File } from "lucide-react";

const AssetViewer = () => {
  const { id } = useParams<{ id: string }>();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const { data: asset, isLoading: assetLoading } = useQuery({
    queryKey: ["asset", id],
    queryFn: () => api.assets.get(id!),
    enabled: !!id,
  });

  const { data: versions } = useQuery({
    queryKey: ["versions", id],
    queryFn: () => api.assets.getVersions(id!),
    enabled: !!id,
  });

  const { data: renditions } = useQuery({
    queryKey: ["renditions", selectedVersionId || asset?.currentVersionId],
    queryFn: () =>
      api.renditions.getByVersion(selectedVersionId || asset?.currentVersionId || ""),
    enabled: !!(selectedVersionId || asset?.currentVersionId),
  });

  const currentVersionId = selectedVersionId || asset?.currentVersionId;
  const currentVersion = versions?.find((v: any) => v.id === currentVersionId);

  if (assetLoading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-500">Loading asset...</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <File className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Asset not found</p>
        <p className="text-sm text-gray-400 mt-1">
          The asset you're looking for doesn't exist
        </p>
      </div>
    );
  }

  const isPDF = asset.type === "pdf" || currentVersion?.mime === "application/pdf";
  const isImage = asset.type === "image" || (currentVersion?.mime?.startsWith("image/"));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {asset.title || "Untitled"}
        </h1>
        {asset.description && (
          <p className="mt-2 text-gray-600">{asset.description}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full uppercase tracking-wide">
            {asset.type}
          </span>
          {asset.tags && asset.tags.length > 0 && (
            <>
              {asset.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </>
          )}
        </div>
      </div>

      {versions && versions.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Version
          </label>
          <select
            value={currentVersionId || ""}
            onChange={(e) => setSelectedVersionId(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
            aria-label="Select version"
          >
            {versions.map((v: any) => (
              <option key={v.id} value={v.id}>
                Version {v.version} ({new Date(v.createdAt).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {isPDF && currentVersionId && (
          <PDFViewer versionId={currentVersionId} renditions={renditions || []} />
        )}
        {isImage && currentVersionId && (
          <ImageViewer versionId={currentVersionId} renditions={renditions || []} />
        )}
        {!isPDF && !isImage && (
          <div className="text-center py-16">
            <File className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Preview not available</p>
            <p className="text-sm text-gray-400 mt-1">
              This file type doesn't support preview
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetViewer;

