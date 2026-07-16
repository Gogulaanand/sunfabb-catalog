import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { TurnstileService } from '../src/contact/turnstile.service.js';

const validBody = {
  name: 'Anand',
  phone: '+91 98765 43210',
  email: 'anand@example.com',
  message: 'I would like to know more about your bulk towel orders please.',
  turnstile_token: 'test-token',
};

async function buildApp(turnstileOk: boolean): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(TurnstileService)
    .useValue({ verify: jest.fn().mockResolvedValue(turnstileOk) })
    .compile();

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

describe('POST /contact', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await buildApp(true);
  });

  afterAll(async () => {
    await app.close();
  });

  it('201 happy path — persists submission and returns id + created_at', async () => {
    const res = await request(app.getHttpServer())
      .post('/contact')
      .send(validBody)
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('created_at');
    expect(res.body).not.toHaveProperty('message');
    expect(res.body).not.toHaveProperty('name');
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
    app = await buildApp(false);
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
