import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Module } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import compression from 'compression';

@Controller()
class PingController {
  @Get('ping')
  ping() {
    // Body must exceed compression's default 1KB threshold to trigger gzip.
    return { message: 'x'.repeat(2000) };
  }
}

@Module({ controllers: [PingController] })
class PingModule {}

describe('compression middleware (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PingModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(compression());
    await app.init();
  });

  it('compresses a response above the size threshold when the client accepts gzip', async () => {
    const response = await request(app.getHttpServer())
      .get('/ping')
      .set('Accept-Encoding', 'gzip');

    expect(response.headers['content-encoding']).toBe('gzip');
  });

  afterEach(async () => {
    await app.close();
  });
});
