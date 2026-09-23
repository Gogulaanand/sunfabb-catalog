export const MAX_PROCESSED_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 2400;

export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SupportedImageMimeType =
  (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];

export class ImagePreprocessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImagePreprocessingError";
  }
}

export function isSupportedImageMimeType(
  value: string,
): value is SupportedImageMimeType {
  return (SUPPORTED_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

function imageLoadError(): ImagePreprocessingError {
  return new ImagePreprocessingError(
    "We couldn't read that image. Choose a valid JPEG, PNG, or WebP file and try again.",
  );
}

type DecodedImage = {
  width: number;
  height: number;
  source: CanvasImageSource;
  dispose: () => void;
};

async function readImage(file: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        dispose: () => bitmap.close(),
      };
    } catch {
      throw imageLoadError();
    }
  }

  if (typeof Image === "undefined" || typeof URL === "undefined") {
    throw imageLoadError();
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(imageLoadError());
      element.src = objectUrl;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      source: image,
      dispose: () => URL.revokeObjectURL(objectUrl),
    };
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw imageLoadError();
  }
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  type: SupportedImageMimeType,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new ImagePreprocessingError(
              "We couldn't compress that image in this browser. Try another JPEG, PNG, or WebP file.",
            ),
          );
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

/**
 * Resize and compress an image before it crosses the Server Action boundary.
 * The returned file is always at or below the backend's 3 MB upload limit.
 */
export async function preprocessImage(file: File): Promise<File> {
  if (!isSupportedImageMimeType(file.type)) {
    throw new ImagePreprocessingError(
      "Choose a JPEG, PNG, or WebP image. Other file types are not supported.",
    );
  }

  if (file.size <= MAX_PROCESSED_IMAGE_BYTES) {
    // Keep small files byte-for-byte intact. This avoids needlessly inflating
    // already-optimized PNGs and preserves their alpha channel.
    return file;
  }

  if (typeof document === "undefined") {
    throw imageLoadError();
  }

  const source = await readImage(file);
  if (!source.width || !source.height) {
    source.dispose();
    throw imageLoadError();
  }

  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / source.width,
    MAX_IMAGE_DIMENSION / source.height,
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    source.dispose();
    throw new ImagePreprocessingError(
      "We couldn't prepare that image in this browser. Try a different browser or image.",
    );
  }

  // The image is drawn only after its dimensions have been validated. The
  // source is either an ImageBitmap or an HTMLImageElement loaded above, so
  // browsers without createImageBitmap still get the same resize path.
  context.drawImage(source.source, 0, 0, canvas.width, canvas.height);
  source.dispose();

  const qualities = [0.84, 0.7, 0.56, 0.42, 0.3];
  const outputTypes: SupportedImageMimeType[] =
    file.type === "image/png"
      ? ["image/png", "image/webp"]
      : [file.type as SupportedImageMimeType];

  let lastSize = 0;
  for (const outputType of outputTypes) {
    for (const quality of qualities) {
      const blob = await canvasBlob(
        canvas,
        outputType,
        outputType === "image/png" ? undefined : quality,
      );
      lastSize = blob.size;
      if (blob.size <= MAX_PROCESSED_IMAGE_BYTES) {
        const extension =
          outputType === "image/webp" ? "webp" : outputType.split("/")[1];
        const filename = file.name.replace(/\.[^./]+$/, "") || "image";
        return new File([blob], `${filename}.${extension}`, {
          type: outputType,
          lastModified: file.lastModified,
        });
      }
    }
  }

  throw new ImagePreprocessingError(
    `This image is still too large after compression (${Math.ceil(lastSize / 1024 / 1024)} MB). Choose a smaller image, then try again.`,
  );
}
