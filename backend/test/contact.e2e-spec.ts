import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { TurnstileService } from '../src/contact/turnstile.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const validBody = {
  name: 'Anand',
  phone: '+91 98765 43210',
  email: 'anand@example.com',
  message: 'I would like to know more about your bulk towel orders please.',
  turnstile_token: 'test-token',
};

const contactMessageCreate = jest.fn().mockResolvedValue({
  id: 'contact-e2e-1',
  created_at: new Date('2026-07-22T00:00:00.000Z'),
});

async function buildApp(
  turnstileOk: boolean,
  opts: { skipThrottle?: boolean } = {},
): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue({ contactMessage: { create: contactMessageCreate } })
    .overrideProvider(TurnstileService)
    .useValue({ verify: jest.fn().mockResolvedValue(turnstileOk) });

  if (opts.skipThrottle) {
    builder.overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true });
  }

  const moduleFixture: TestingModule = await builder.compile();
  const app = moduleFixture.createNestApplication({ rawBody: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

describe('POST /contact — happy path', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    contactMessageCreate.mockClear();
    app = await buildApp(true);
  });

  afterAll(async () => {
    await app.close();
  });

  it('201 — persists submission and returns id + created_at', async () => {
    const res = await request(app.getHttpServer())
      .post('/contact')
      .send(validBody)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('created_at');
    expect(res.body).not.toHaveProperty('message');
    expect(res.body).not.toHaveProperty('name');
    expect(contactMessageCreate).toHaveBeenCalledWith({
      data: {
        name: validBody.name,
        phone: validBody.phone,
        email: validBody.email,
        message: validBody.message,
      },
      select: { id: true, created_at: true },
    });
  });
});

// Throttle is bypassed here so validation failures return 400, not 429.
describe('POST /contact — validation', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await buildApp(true, { skipThrottle: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('400 on missing name', () => {
    const { name: _n, ...body } = validBody;
    return request(app.getHttpServer()).post('/contact').send(body).expect(400);
  });

  it('400 on missing phone', () => {
    const { phone: _p, ...body } = validBody;
    return request(app.getHttpServer()).post('/contact').send(body).expect(400);
  });

  it('400 on message shorter than 10 characters', () => {
    return request(app.getHttpServer())
      .post('/contact')
      .send({ ...validBody, message: 'Short' })
      .expect(400);
  });

  it('400 on unknown extra field (forbidNonWhitelisted)', () => {
    return request(app.getHttpServer())
      .post('/contact')
      .send({ ...validBody, extra_field: 'hacked' })
      .expect(400);
  });

  it('400 when honeypot company field is filled', () => {
    return request(app.getHttpServer())
      .post('/contact')
      .send({ ...validBody, company: 'spam company' })
      .expect(400);
  });
});

describe('POST /contact — captcha failure', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await buildApp(false, { skipThrottle: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('403 when Turnstile verification fails', () => {
    return request(app.getHttpServer())
      .post('/contact')
      .send(validBody)
      .expect(403);
  });
});

describe('POST /contact — throttle', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await buildApp(true);
  });

  afterAll(async () => {
    await app.close();
  });

  it('429 after 3 rapid posts from the same IP', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).post('/contact').send(validBody);
    }
    await request(app.getHttpServer())
      .post('/contact')
      .send(validBody)
      .expect(429);
  });
});
