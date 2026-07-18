import { GoogleGenAI } from '@google/genai';
import type { z } from 'zod';
import { requireEnv } from './config.js';
import { sleep } from './util.js';

export interface ImagePart {
  data: Buffer;
  mimeType: string;
}

interface Part {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

function toParts(text: string, images: ImagePart[]): Part[] {
  return [
    { text },
    ...images.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data.toString('base64') },
    })),
  ];
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * A 429 that quotes a free-tier quota with limit 0 is not transient: the key's
 * Cloud project has no billing enabled, and this model has no free quota at all.
 */
function isBillingDisabled(message: string): boolean {
  return /free_tier/i.test(message) && /limit:\s*0/.test(message);
}

function isRetryable(message: string): boolean {
  return /\b(429|500|503|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|rate limit)\b/i.test(message);
}

async function withRetry<T>(label: string, fn: () => Promise<T>, maxTries = 5): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const message = messageOf(error);
      if (isBillingDisabled(message)) {
        throw new Error(
          'This model has no free API quota and the API key\'s Google Cloud project has no' +
            ' billing enabled. Enable billing for the key\'s project at' +
            ' https://aistudio.google.com/apikey and retry.',
        );
      }
      if (attempt >= maxTries || !isRetryable(message)) throw error;
      const delayMs = Math.min(60_000, 2_000 * 2 ** (attempt - 1));
      console.warn(
        `  ${label}: transient API error, retrying in ${delayMs / 1000}s ` +
          `(attempt ${attempt}/${maxTries}): ${message.slice(0, 120)}`,
      );
      await sleep(delayMs);
    }
  }
}

export class GeminiClient {
  private readonly ai: GoogleGenAI;

  constructor() {
    const { GEMINI_API_KEY } = requireEnv(['GEMINI_API_KEY']);
    this.ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  /**
   * Vision analysis with structured JSON output, validated with zod at the
   * boundary (project rule D30: validate, never cast).
   */
  async analyzeJson<T>(options: {
    model: string;
    prompt: string;
    images: ImagePart[];
    jsonSchema: object;
    zodSchema: z.ZodType<T>;
    label: string;
  }): Promise<T> {
    const response = await withRetry(options.label, () =>
      this.ai.models.generateContent({
        model: options.model,
        contents: [{ role: 'user', parts: toParts(options.prompt, options.images) }],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: options.jsonSchema,
        },
      }),
    );
    const text = response.text;
    if (!text) throw new Error(`${options.label}: model returned no text`);
    return options.zodSchema.parse(JSON.parse(text));
  }

  /** Image generation / editing. Returns the first image in the response. */
  async generateImage(options: {
    model: string;
    prompt: string;
    images: ImagePart[];
    aspectRatio?: string;
    imageSize?: string;
    label: string;
  }): Promise<Buffer> {
    const response = await withRetry(options.label, () =>
      this.ai.models.generateContent({
        model: options.model,
        contents: [{ role: 'user', parts: toParts(options.prompt, options.images) }],
        config: {
          ...(options.aspectRatio || options.imageSize
            ? {
                imageConfig: {
                  ...(options.aspectRatio ? { aspectRatio: options.aspectRatio } : {}),
                  ...(options.imageSize ? { imageSize: options.imageSize } : {}),
                },
              }
            : {}),
        },
      }),
    );
    const parts: Part[] = response.candidates?.[0]?.content?.parts ?? [];
    const data = parts.find((p) => p.inlineData?.data)?.inlineData?.data;
    if (!data) {
      const reason = parts.find((p) => p.text)?.text ?? 'no image and no explanation returned';
      throw new Error(`${options.label}: generation returned no image (${reason.slice(0, 300)})`);
    }
    return Buffer.from(data, 'base64');
  }

  /** For the doctor command: list model ids visible to this API key. */
  async listModelIds(): Promise<string[]> {
    const ids: string[] = [];
    const pager = await this.ai.models.list();
    for await (const model of pager) {
      if (model.name) ids.push(model.name.replace(/^models\//, ''));
    }
    return ids;
  }
}
