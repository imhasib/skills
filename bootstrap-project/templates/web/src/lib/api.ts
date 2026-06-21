import { ApiError } from './api-error';

const API_VERSION_HEADER = 'API-Version';
const API_VERSION_DEFAULT = 'v1';
const DEFAULT_API_BASE = '/api';

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  jwt?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /**
   * Override the base URL. Defaults to the browser-relative `/api`
   * prefix so client-side calls go through Next.js (and from there, host
   * nginx). Server components should pass an absolute URL via `serverApiFetch`.
   */
  baseUrl?: string;
}

function resolveUrl(path: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalisedPath = path.startsWith('/') ? path : `/${path}`;
  // If the caller already prefixed the API base, do not double it up.
  if (baseUrl.endsWith(DEFAULT_API_BASE) && normalisedPath.startsWith(`${DEFAULT_API_BASE}/`)) {
    return `${baseUrl.slice(0, -DEFAULT_API_BASE.length)}${normalisedPath}`;
  }
  if (baseUrl === DEFAULT_API_BASE && normalisedPath.startsWith(`${DEFAULT_API_BASE}/`)) {
    return normalisedPath;
  }
  return `${baseUrl}${normalisedPath}`;
}

/**
 * Typed fetch wrapper for the backend.
 *
 * - Resolves `/api` against the (possibly overridden) `baseUrl`.
 * - Always sets `API-Version: v1`.
 * - Attaches a Bearer token when `jwt` is provided.
 * - Throws `ApiError` (parsed from the flat error body) on non-2xx responses.
 */
export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const baseUrl = opts.baseUrl ?? DEFAULT_API_BASE;
  const url = resolveUrl(path, baseUrl);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    [API_VERSION_HEADER]: API_VERSION_DEFAULT,
    ...opts.headers,
  };

  if (opts.jwt) {
    headers.Authorization = `Bearer ${opts.jwt}`;
  }

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body,
    signal: opts.signal,
  });

  if (!res.ok) {
    throw await ApiError.fromResponse(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
