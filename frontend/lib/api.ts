export type ApiPayload = unknown;

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

import config from "./config";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || config.API_BASE_URL;

const jsonHeaders = {
  "Content-Type": "application/json",
};

const buildUrl = (path: string, params?: Record<string, any>) => {
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  let url = `${API_BASE_URL}${trimmed}`;
  if (params) {
    const parts: string[] = [];
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    });
    if (parts.length > 0) url += `?${parts.join("&")}`;
  }
  return url;
};

const parseError = async (response: Response): Promise<ApiError> => {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }

  return {
    status: response.status,
    message:
      typeof body === "object" && body && "message" in body
        ? (body as any).message
        : response.statusText || "Unknown error",
    details: body,
  };
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
  token?: string,
  params?: Record<string, any>,
): Promise<T> => {
  const url = buildUrl(path, params);
  const headers: Record<string, string> = {
    ...jsonHeaders,
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await parseError(response);
    throw error;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
};

export const api = {
  get: <T>(path: string, token?: string, params?: Record<string, any>) =>
    request<T>(path, { method: "GET" }, token, params),
  post: <T>(path: string, body: ApiPayload, token?: string) =>
    request<T>(
      path,
      { method: "POST", body: body ? JSON.stringify(body) : null },
      token,
    ),
  patch: <T>(path: string, body: ApiPayload, token?: string) =>
    request<T>(
      path,
      { method: "PATCH", body: body ? JSON.stringify(body) : null },
      token,
    ),
  delete: <T>(path: string, token?: string) =>
    request<T>(path, { method: "DELETE" }, token),
};

export default api;
