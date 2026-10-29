import { supabase } from "@/lib/supabase";

type RequestMethod = "GET" | "POST" | "PATCH";

async function request<T>(path: string, method: RequestMethod = "GET", body?: unknown): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Your session is unavailable. Sign in again and retry.");
  }
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error ?? "Request failed";
    throw new Error(message);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, "GET"),
  post: <T>(path: string, body: unknown) => request<T>(path, "POST", body),
  patch: <T>(path: string, body: unknown) => request<T>(path, "PATCH", body),
};
