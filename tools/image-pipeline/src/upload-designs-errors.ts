export class ApiHttpError extends Error {
  constructor(
    readonly method: string,
    readonly path: string,
    readonly status: number,
    detail: string,
  ) {
    super(`${method} ${path} -> ${status}: ${detail.slice(0, 400)}`);
    this.name = 'ApiHttpError';
  }
}

export class ApiContractError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ApiContractError';
  }
}
