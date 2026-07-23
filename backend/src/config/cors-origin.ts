type CorsCallback = (error: Error | null, allow?: boolean) => void;

const LOCAL_FRONTEND_ORIGIN = 'http://localhost:3001';

export function parseConfiguredOrigins(value: string | undefined): string[] {
  const origins = (value ?? LOCAL_FRONTEND_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set(origins)];
}

export function createCorsOriginChecker(
  configuredOrigins: string[],
): (origin: string | undefined, callback: CorsCallback) => void {
  const allowedOrigins = new Set(
    configuredOrigins.map((origin) => origin.trim()).filter(Boolean),
  );

  return (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed'), false);
  };
}
