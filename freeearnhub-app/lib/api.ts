import axios, { AxiosError, AxiosInstance } from "axios";

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://startup-platform-eight.vercel.app").replace(
  /\/$/,
  ""
);

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

let bearerToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setApiToken(token: string | null) {
  bearerToken = token;
  // Also update axios defaults so the header is always present even if an interceptor
  // is skipped (rare, but observed on some native/dev flows).
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((config) => {
    if (bearerToken) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${bearerToken}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (resp) => resp,
    (err: AxiosError) => {
      const status = err.response?.status ?? 0;
      const data = err.response?.data as { error?: string } | undefined;
      const message = data?.error || err.message || "Request failed";
      if (status === 401 || status === 403) {
        // Token might be expired or revoked. Let the auth store clear state and redirect to login.
        try {
          onUnauthorized?.();
        } catch {
          // ignore
        }
      }
      throw new ApiError(message, status, err.response?.data);
    }
  );

  return client;
}

export const api = createApiClient();
