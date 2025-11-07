import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { api } from "../lib/api";

// Set worker path - use jsdelivr CDN which is more reliable
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  versionId: string;
  renditions: Array<{
    id: string;
    kind: string;
    page?: number;
    url?: string;
    ready: boolean;
  }>;
}

const PDFViewer = ({ versionId, renditions }: PDFViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF document (only once)
  useEffect(() => {
    if (pdfDoc) return; // Already loaded

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        const downloadData = await api.assets.download(versionId);
        const loadingTask = pdfjsLib.getDocument({
          url: downloadData.url,
          httpHeaders: {},
          withCredentials: false,
        });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        // Don't set loading to false here - let the render effect handle it
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load PDF");
        setLoading(false);
      }
    };

    loadPDF();
  }, [versionId, pdfDoc]);

  // Render current page (either from renditions or PDF)
  useEffect(() => {
    // Cancel any ongoing render task
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    const renderPage = async () => {
      if (!canvasRef.current) return;

      // Try to get PDF from renditions first
      const pdfRendition = renditions.find(
        (r) => r.kind === "page" && r.page === currentPage && r.ready
      );

      if (pdfRendition?.url) {
        // Use rendered page if available
        try {
          setLoading(true);
          setError(null);
          const ctx = canvasRef.current.getContext("2d");
          if (!ctx) {
            setLoading(false);
            return;
          }

          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            if (ctx && canvasRef.current) {
              canvasRef.current.width = img.width;
              canvasRef.current.height = img.height;
              ctx.drawImage(img, 0, 0);
            }
            setLoading(false);
          };
          img.onerror = () => {
            setError("Failed to load rendered page");
            setLoading(false);
          };
          img.src = pdfRendition.url;
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load rendered page");
          setLoading(false);
        }
        return;
      }

      // Otherwise, render from PDF document
      if (!pdfDoc) return;

      try {
        setLoading(true);
        setError(null);
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) {
          setLoading(false);
          return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setLoading(false);
          return;
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        // Store the render task so we can cancel it if needed
        const renderTask = page.render(renderContext);
        const currentTask = renderTask;
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        
        // Only update state if this render task wasn't cancelled
        if (renderTaskRef.current === currentTask) {
          renderTaskRef.current = null;
          setLoading(false);
        }
      } catch (err) {
        // Only handle error if this render task wasn't cancelled
        // Check if renderTaskRef was cleared (indicating cancellation)
        if (!renderTaskRef.current) {
          // Task was cancelled, ignore the error
          return;
        }
        
        // Check if it's a cancellation error
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes("cancel") || errorMessage.includes("Cancel")) {
          // Silently ignore cancellation
          renderTaskRef.current = null;
          return;
        }
        
        setError(err instanceof Error ? err.message : "Failed to render page");
        setLoading(false);
        renderTaskRef.current = null;
      }
    };

    renderPage();

    // Cleanup function to cancel render on unmount or dependency change
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [currentPage, scale, pdfDoc, renditions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4">
            Page {currentPage} {totalPages > 0 && `of ${totalPages}`}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
            disabled={currentPage >= totalPages || loading}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            -
          </button>
          <span>{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex justify-center bg-gray-100 p-4 rounded min-h-[600px] items-center relative">
        <canvas
          ref={canvasRef}
          className={`max-w-full shadow-lg ${loading || error ? "opacity-0 absolute" : "opacity-100"}`}
        />
        {loading && (
          <div className="text-center absolute">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">Loading PDF...</p>
          </div>
        )}
        {error && (
          <div className="text-center text-red-600 absolute">
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;

