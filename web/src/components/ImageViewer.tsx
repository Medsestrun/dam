import { useState, useRef, useEffect } from "react";

interface ImageViewerProps {
  versionId: string;
  renditions: Array<{
    id: string;
    kind: string;
    page?: number;
    url?: string;
    width?: number;
    height?: number;
    ready: boolean;
  }>;
}

const ImageViewer = ({ versionId, renditions }: ImageViewerProps) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Find the best available rendition
  const previewRendition = renditions.find(
    (r) => r.kind === "preview" && r.ready && r.url,
  );
  const thumbRendition = renditions.find(
    (r) => r.kind === "thumb" && r.ready && r.url,
  );
  const imageRendition = previewRendition || thumbRendition;

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.5, Math.min(4, prev + delta)));
  };

  useEffect(() => {
    // Reset position when zoom changes to 1
    if (zoom === 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [zoom]);

  if (!imageRendition?.url) {
    return (
      <div className="w-full h-[600px] bg-gray-100 rounded flex items-center justify-center">
        <p className="text-gray-500">No preview available</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom out"
          >
            Zoom Out
          </button>
          <span className="px-3 py-1.5 text-sm font-medium text-gray-700">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 4}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Zoom in"
          >
            Zoom In
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            aria-label="Reset zoom"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="w-full h-[600px] bg-gray-100 overflow-hidden relative cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
        >
          <img
            ref={imageRef}
            src={imageRendition.url}
            alt="Preview"
            className="max-w-none object-contain"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;

