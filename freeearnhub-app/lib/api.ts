const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://startup-platform-eight.vercel.app").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiRequestOptions = RequestInit & {
  token?: string;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
  });

  const text = await response.text();
  let data: T | { error?: string } | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T | { error?: string };
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === "object" && data && "error" in data && data.error
        ? data.error
        : response.statusText || "Request failed";
    throw new ApiError(errorMessage, response.status);
  }

  return (data ?? {}) as T;
}
