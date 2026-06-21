import 'dotenv/config';
import { setDefaultAutoSelectFamily } from 'net';
import compression from 'compression';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

// Node's Happy Eyeballs (autoSelectFamily) can time out connecting to hosts that
// round-robin across IPv4 + IPv6 (e.g. Neon's pooler) on networks with no IPv6 route.
// Disabling it falls back to plain sequential address resolution, which works everywhere.
setDefaultAutoSelectFamily(false);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
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
