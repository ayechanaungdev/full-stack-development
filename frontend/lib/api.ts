export type ApiPayload = Record<string, unknown> | null;

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const jsonHeaders = {
  "Content-Type": "application/json",
};

const buildUrl = (path: string) => {
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${trimmed}`;
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
): Promise<T> => {
  const url = buildUrl(path);
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
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: "GET" }, token),
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
