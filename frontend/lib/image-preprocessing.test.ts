import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  ImagePreprocessingError,
  MAX_PROCESSED_IMAGE_BYTES,
  preprocessImage,
} from "./image-preprocessing";

describe("preprocessImage", () => {
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  const originalDocument = globalThis.document;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: originalCreateImageBitmap,
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
  });

  it("keeps an already-optimized supported file unchanged", async () => {
    const file = new File([new Uint8Array(10)], "small.jpg", {
      type: "image/jpeg",
    });

    await expect(preprocessImage(file)).resolves.toBe(file);
  });

  it("rejects unsupported MIME types with an actionable message", async () => {
    const file = new File(["not an image"], "notes.txt", {
      type: "text/plain",
    });

    await expect(preprocessImage(file)).rejects.toMatchObject({
      name: "ImagePreprocessingError",
      message: expect.stringContaining("JPEG, PNG, or WebP"),
    });
  });

  it("resizes/compresses a large image until it is within the 3 MB boundary", async () => {
    const bitmap = { width: 4000, height: 3000, close: vi.fn() };
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: vi.fn().mockResolvedValue(bitmap),
    });

    const toBlob = vi.fn((callback: BlobCallback, type?: string) => {
      callback(
        new Blob([new Uint8Array(type === "image/jpeg" ? 100 : 200)], {
          type,
        }),
      );
    });
    const context = { drawImage: vi.fn() };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(context),
      toBlob,
    } as unknown as HTMLCanvasElement;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { createElement: vi.fn().mockReturnValue(canvas) },
    });

    const file = new File(
      [new Uint8Array(MAX_PROCESSED_IMAGE_BYTES + 1)],
      "large.jpg",
      { type: "image/jpeg" },
    );
    const result = await preprocessImage(file);

    expect(result.size).toBeLessThanOrEqual(MAX_PROCESSED_IMAGE_BYTES);
    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("large.jpeg");
    expect(canvas.width).toBe(2400);
    expect(canvas.height).toBe(1800);
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 2400, 1800);
    expect(bitmap.close).toHaveBeenCalledTimes(1);
  });

  it("falls back to WebP for a PNG that cannot fit under 3 MB", async () => {
    const bitmap = { width: 100, height: 100, close: vi.fn() };
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: vi.fn().mockResolvedValue(bitmap),
    });

    const toBlob = vi.fn((callback: BlobCallback, type?: string) => {
      callback(
        new Blob(
          [
            new Uint8Array(
              type === "image/png" ? MAX_PROCESSED_IMAGE_BYTES + 1 : 20,
            ),
          ],
          { type },
        ),
      );
    });
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
      toBlob,
    } as unknown as HTMLCanvasElement;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { createElement: vi.fn().mockReturnValue(canvas) },
    });

    const file = new File(
      [new Uint8Array(MAX_PROCESSED_IMAGE_BYTES + 1)],
      "large.png",
      { type: "image/png" },
    );
    const result = await preprocessImage(file);

    expect(result.type).toBe("image/webp");
    expect(result.name).toBe("large.webp");
    expect(toBlob.mock.calls.some(([, type]) => type === "image/webp")).toBe(
      true,
    );
  });

  it("fails with a recovery message when the browser cannot create a canvas", async () => {
    const bitmap = { width: 100, height: 100, close: vi.fn() };
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: vi.fn().mockResolvedValue(bitmap),
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement: vi.fn().mockReturnValue({
          getContext: vi.fn().mockReturnValue(null),
        }),
      },
    });

    const file = new File(
      [new Uint8Array(MAX_PROCESSED_IMAGE_BYTES + 1)],
      "large.webp",
      { type: "image/webp" },
    );

    await expect(preprocessImage(file)).rejects.toBeInstanceOf(
      ImagePreprocessingError,
    );
  });
});
