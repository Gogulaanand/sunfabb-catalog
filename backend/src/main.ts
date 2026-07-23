import 'dotenv/config';
import { setDefaultAutoSelectFamily } from 'net';
import compression from 'compression';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import {
  createCorsOriginChecker,
  parseConfiguredOrigins,
} from './config/cors-origin.js';

// Node's Happy Eyeballs (autoSelectFamily) can time out connecting to hosts that
// round-robin across IPv4 + IPv6 (e.g. Neon's pooler) on networks with no IPv6 route.
// Disabling it falls back to plain sequential address resolution, which works everywhere.
setDefaultAutoSelectFamily(false);

async function bootstrap() {
  // rawBody: true exposes the untouched request bytes on req.rawBody, which the
  // Razorpay webhook needs to verify X-Razorpay-Signature — the HMAC is computed
  // over the exact payload Razorpay sent, and the JSON-parsed-then-reserialised
  // body has different bytes and would fail verification (§7.1 raw-body gotcha).
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    origin: createCorsOriginChecker(
      parseConfiguredOrigins(process.env.FRONTEND_URL),
    ),
  });

  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
