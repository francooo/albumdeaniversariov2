/**
 * Cliente da API do Memórias. O navegador não fala mais com o banco: tudo passa por /api,
 * com a sessão num cookie httpOnly (o JavaScript da página não consegue ler).
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Limite de álbuns do plano atingido (403 plan_limit). */
export class PlanLimitError extends ApiError {
  constructor(message: string) {
    super(403, 'plan_limit', message);
    this.name = 'PlanLimitError';
  }
}

let onUnauthorized: (() => void) | null = null;

/** O AuthProvider registra aqui o que fazer quando a sessão expira (desloga e volta ao login). */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

const OFFLINE = 'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'offline', OFFLINE);
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const code: string = data?.error ?? 'server_error';
    const message: string = data?.message ?? OFFLINE;
    if (res.status === 401 && code === 'unauthorized') onUnauthorized?.();
    if (code === 'plan_limit') throw new PlanLimitError(message);
    throw new ApiError(res.status, code, message);
  }
  return data as T;
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  del: <T = void>(path: string) => request<T>('DELETE', path),
};

const enc = encodeURIComponent;
export { enc };
