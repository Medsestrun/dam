import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Search, File, Image, Video, Music, FileText } from "lucide-react";
import { useState } from "react";

const AssetsList = () => {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["assets", query, typeFilter],
    queryFn: () => api.assets.list({ query, type: typeFilter || undefined, limit: 50 }),
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      case "audio":
        return <Music className="h-5 w-5" />;
      case "pdf":
        return <FileText className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and organize your digital assets
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm"
            aria-label="Search assets"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm min-w-[160px]"
          aria-label="Filter by type"
        >
          <option value="">All Types</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="pdf">PDF</option>
          <option value="doc">Document</option>
          <option value="xls">Spreadsheet</option>
          <option value="ppt">Presentation</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">Loading assets...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {data?.items.map((asset: any) => (
            <Link
              key={asset.id}
              to={`/assets/${asset.id}`}
              className="group bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-200 flex flex-col"
              aria-label={`View asset ${asset.title || "Untitled"}`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                  <div className="text-gray-600 group-hover:text-blue-600">
                    {getIcon(asset.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {asset.title || "Untitled"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">
                    {asset.type}
                  </p>
                </div>
              </div>
              {asset.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3 flex-1">
                  {asset.description}
                </p>
              )}
              {asset.tags && asset.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-auto pt-3 border-t border-gray-100">
                  {asset.tags.slice(0, 3).map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-md font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                  {asset.tags.length > 3 && (
                    <span className="px-2 py-0.5 text-xs text-gray-500">
                      +{asset.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <File className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No assets found</p>
          <p className="text-sm text-gray-400 mt-1">
            {query || typeFilter
              ? "Try adjusting your search or filters"
              : "Upload your first asset to get started"}
          </p>
        </div>
      )}
    </div>
  );
};

export default AssetsList;

