import { z } from 'zod';
import {
  AdminProductSchema,
  type AdminProductLookup,
} from './upload-designs-contracts.js';
import { ApiContractError, ApiHttpError } from './upload-designs-errors.js';

export { ApiContractError, ApiHttpError } from './upload-designs-errors.js';

export class Api {
  constructor(
    private readonly base: string,
    private readonly token: string,
  ) {}

  private async request(
    method: string,
    requestPath: string,
    body?: unknown,
  ): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.base}${requestPath}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      throw new ApiContractError(
        `${method} ${requestPath} network failure; refusing to infer product absence`,
        error,
      );
    }
    if (!response.ok) {
      let detail = '';
      try {
        detail = await response.text();
      } catch {
        detail = 'response body unavailable';
      }
      throw new ApiHttpError(method, requestPath, response.status, detail);
    }
    return response;
  }

  private async json<T>(
    response: Response,
    schema: z.ZodType<T>,
    method: string,
    requestPath: string,
  ): Promise<T> {
    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw new ApiContractError(
        `${method} ${requestPath} returned invalid JSON`,
        error,
      );
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiContractError(
        `${method} ${requestPath} returned an unexpected response shape: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }

  async get<T>(requestPath: string, schema: z.ZodType<T>): Promise<T> {
    return this.json(
      await this.request('GET', requestPath),
      schema,
      'GET',
      requestPath,
    );
  }

  async post<T>(
    requestPath: string,
    body: unknown,
    schema: z.ZodType<T>,
  ): Promise<T> {
    return this.json(
      await this.request('POST', requestPath, body),
      schema,
      'POST',
      requestPath,
    );
  }

  async patch<T>(
    requestPath: string,
    body: unknown,
    schema: z.ZodType<T>,
  ): Promise<T> {
    return this.json(
      await this.request('PATCH', requestPath, body),
      schema,
      'PATCH',
      requestPath,
    );
  }

  async delete<T>(requestPath: string, schema: z.ZodType<T>): Promise<T> {
    return this.json(
      await this.request('DELETE', requestPath),
      schema,
      'DELETE',
      requestPath,
    );
  }

  /** Protected admin detail: only a genuine 404 is an absent product. */
  async getAdminProduct(slug: string): Promise<AdminProductLookup> {
    const requestPath = `/products/admin/${encodeURIComponent(slug)}`;
    let response: Response;
    try {
      response = await fetch(`${this.base}${requestPath}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
      });
    } catch (error) {
      throw new ApiContractError(
        `${requestPath} network failure; refusing to infer product absence`,
        error,
      );
    }
    if (response.status === 404) return { kind: 'missing' };
    if (!response.ok) {
      let detail = '';
      try {
        detail = await response.text();
      } catch {
        detail = 'response body unavailable';
      }
      throw new ApiHttpError('GET', requestPath, response.status, detail);
    }
    return {
      kind: 'found',
      product: await this.json(
        response,
        AdminProductSchema,
        'GET',
        requestPath,
      ),
    };
  }

  /** Detects a missing admin route when it falsely returns 404 for an existing public product. */
  async publicProductExists(slug: string): Promise<boolean> {
    const requestPath = `/products/${encodeURIComponent(slug)}`;
    let response: Response;
    try {
      response = await fetch(`${this.base}${requestPath}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      throw new ApiContractError(
        `${requestPath} network failure; refusing to infer product absence`,
        error,
      );
    }
    if (response.status === 404) return false;
    if (!response.ok) {
      let detail = '';
      try {
        detail = await response.text();
      } catch {
        detail = 'response body unavailable';
      }
      throw new ApiHttpError('GET', requestPath, response.status, detail);
    }
    return true;
  }
}
