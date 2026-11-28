/** Erro com status HTTP e código estável que o navegador entende (ex.: 'plan_limit'). */
export class HttpError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 413 | 500 | 502,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Item') => new HttpError(404, 'not_found', `${what} não encontrado.`);
export const badRequest = (message: string) => new HttpError(400, 'bad_request', message);
export const unauthorized = () => new HttpError(401, 'unauthorized', 'Sua sessão expirou. Entre de novo.');
