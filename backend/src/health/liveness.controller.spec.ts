import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { HealthModule } from './health.module.js';
import { LivenessController } from './liveness.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('LivenessController', () => {
  it('returns a stable process-liveness response without a Prisma dependency', () => {
    const controller = new LivenessController();

    expect(controller.check()).toEqual({ status: 'live' });
  });
});

describe('GET /live', () => {
  let app: INestApplication<App>;
  const count = jest.fn();

  beforeEach(async () => {
    count.mockReset();
    const module = await Test.createTestingModule({
      imports: [PrismaModule, HealthModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ category: { count } })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  it('returns 200 without querying Prisma even when the database is unavailable', async () => {
    count.mockRejectedValue(new Error('database unavailable'));

    await request(app.getHttpServer())
      .get('/live')
      .expect(200)
      .expect({ status: 'live' });

    expect(count).not.toHaveBeenCalled();
  });

  it('keeps the database-backed health endpoint available when the database probe succeeds', async () => {
    count.mockResolvedValue(41);

    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });

    expect(count).toHaveBeenCalledWith();
  });

  it('returns 503 from the health endpoint when the database probe fails', async () => {
    count.mockRejectedValue(new Error('database unavailable'));
    jest.spyOn(console, 'error').mockImplementation();

    await request(app.getHttpServer()).get('/health').expect(503);

    expect(count).toHaveBeenCalledWith();
  });
});
