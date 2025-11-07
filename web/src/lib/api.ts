const API_BASE = "/api";

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail?: string;
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      type: "unknown",
      title: "Error",
      status: response.status,
      detail: response.statusText,
    }));
    throw new Error(error.detail || error.title);
  }
  return response.json();
};

const getAuthHeaders = (): HeadersInit => {
  return {
    "Content-Type": "application/json",
  };
};

export const api = {
  uploads: {
    init: async (data: {
      target: "new_asset" | "new_version";
      assetId?: string;
      fileName: string;
      mime: string;
      totalSize: number;
    }) => {
      const response = await fetch(`${API_BASE}/uploads`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse<{
        uploadId: string;
        partSize: number;
        bucket: string;
        key: string;
      }>(response);
    },

    getPartUrl: async (uploadId: string, partNumber: number) => {
      const response = await fetch(`${API_BASE}/uploads/${uploadId}/parts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ partNumber }),
      });
      return handleResponse<{ url: string; partNumber: number }>(response);
    },

    complete: async (
      uploadId: string,
      data: {
        parts: Array<{ partNumber: number; etag: string }>;
        sha256?: string;
      },
    ) => {
      const response = await fetch(`${API_BASE}/uploads/${uploadId}/complete`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse<{ assetId: string; versionId: string }>(response);
    },

    abort: async (uploadId: string) => {
      const response = await fetch(`${API_BASE}/uploads/${uploadId}/abort`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to abort upload");
      }
    },
  },

  assets: {
    list: async (params?: {
      query?: string;
      type?: string;
      status?: string;
      tags?: string[];
      limit?: number;
      offset?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.query) searchParams.set("query", params.query);
      if (params?.type) searchParams.set("type", params.type);
      if (params?.status) searchParams.set("status", params.status);
      if (params?.tags) searchParams.set("tags", params.tags.join(","));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.offset) searchParams.set("offset", String(params.offset));

      const response = await fetch(
        `${API_BASE}/assets?${searchParams.toString()}`,
        {
          headers: getAuthHeaders(),
        },
      );
      return handleResponse<{
        items: Array<any>;
        total: number;
        limit: number;
        offset: number;
      }>(response);
    },

    get: async (id: string) => {
      const response = await fetch(`${API_BASE}/assets/${id}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    getVersions: async (id: string) => {
      const response = await fetch(`${API_BASE}/assets/${id}/versions`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<Array<any>>(response);
    },

    download: async (versionId: string) => {
      const response = await fetch(
        `${API_BASE}/assets/download/${versionId}`,
        {
          headers: getAuthHeaders(),
        },
      );
      return handleResponse<{ url: string; expiresIn: number }>(response);
    },
  },

  renditions: {
    getByVersion: async (versionId: string) => {
      const response = await fetch(
        `${API_BASE}/renditions/${versionId}`,
        {
          headers: getAuthHeaders(),
        },
      );
      return handleResponse<Array<{
        id: string;
        kind: string;
        page?: number;
        width?: number;
        height?: number;
        url?: string;
        ready: boolean;
      }>>(response);
    },
  },

  annotations: {
    list: async (versionId: string, page?: number) => {
      const searchParams = new URLSearchParams({ versionId });
      if (page !== undefined) searchParams.set("page", String(page));
      const response = await fetch(
        `${API_BASE}/annotations?${searchParams.toString()}`,
        {
          headers: getAuthHeaders(),
        },
      );
      return handleResponse<Array<any>>(response);
    },

    create: async (data: {
      versionId: string;
      page?: number;
      kind: "pin" | "rect" | "arrow" | "highlight" | "text";
      payload: Record<string, unknown>;
      comment?: string;
    }) => {
      const response = await fetch(`${API_BASE}/annotations`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse<{ id: string; threadId?: string }>(response);
    },
  },

  comments: {
    getThreads: async (versionId: string) => {
      const response = await fetch(
        `${API_BASE}/comments/threads?versionId=${versionId}`,
        {
          headers: getAuthHeaders(),
        },
      );
      return handleResponse<Array<any>>(response);
    },

    getComments: async (threadId: string) => {
      const response = await fetch(
        `${API_BASE}/comments/threads/${threadId}/comments`,
        {
          headers: getAuthHeaders(),
        },
      );
      return handleResponse<Array<any>>(response);
    },

    create: async (threadId: string, body: string) => {
      const response = await fetch(
        `${API_BASE}/comments/threads/${threadId}/comments`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ body }),
        },
      );
      return handleResponse<{ id: string }>(response);
    },
  },
};

