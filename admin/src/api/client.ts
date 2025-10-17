const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

type Options = {
  method?: string;
  token?: string | null;
  body?: unknown;
  params?: Record<string, string | undefined>;
};

function buildUrl(path: string, params?: Record<string, string | undefined>) {
  const url = new URL(path, API_BASE);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
}

export async function apiRequest<T>(path: string, options: Options = {}): Promise<T> {
  const url = buildUrl(path, options.params);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
