import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('BuildingsController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    
    // Set the global prefix like in main.ts
    const configService = app.get(ConfigService);
    const appConfig = configService.get('app');
    app.setGlobalPrefix(appConfig.apiPrefix);
    
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // Buildings controller is currently empty (placeholder)
  // These tests verify that the routes return 404 as expected
  
  it('/mcapi/buildings (GET) - should return 404 (no endpoints implemented)', () => {
    return request(app.getHttpServer())
      .get('/mcapi/buildings')
      .expect(404);
  });

  it('/mcapi/buildings/:id (GET) - should return 404 (no endpoints implemented)', () => {
    return request(app.getHttpServer())
      .get('/mcapi/buildings/test-id')
      .expect(404);
  });

  it('/mcapi/buildings (POST) - should return 404 (no endpoints implemented)', () => {
    const createDto = {
      name: 'Test Building',
      address: 'Test Address',
    };

    return request(app.getHttpServer())
      .post('/mcapi/buildings')
      .send(createDto)
      .expect(404);
  });

  it('/mcapi/buildings/:id (PUT) - should return 404 (no endpoints implemented)', () => {
    const updateDto = {
      name: 'Updated Building',
      address: 'Updated Address',
    };

    return request(app.getHttpServer())
      .put('/mcapi/buildings/test-id')
      .send(updateDto)
      .expect(404);
  });

  it('/mcapi/buildings/:id (DELETE) - should return 404 (no endpoints implemented)', () => {
    return request(app.getHttpServer())
      .delete('/mcapi/buildings/test-id')
      .expect(404);
  });
});