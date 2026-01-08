import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/infrastructure/database/database.service';

describe('Buildings MCP Integration (e2e)', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('MCP Tools Listing', () => {
    it('should list buildings MCP tools', async () => {
      const response = await request(app.getHttpServer())
        .get('/mcapi/mcp/tools')
        .expect(200);

      expect(response.body.tools).toBeDefined();
      expect(Array.isArray(response.body.tools)).toBe(true);
      
      // Check for buildings tools
      const buildingsTools = response.body.tools.filter((tool: any) => 
        tool.name.startsWith('search_buildings_')
      );
      
      expect(buildingsTools).toHaveLength(2);
      
      // Verify basic search tool
      const basicTool = buildingsTools.find((tool: any) => tool.name === 'search_buildings_basic');
      expect(basicTool).toBeDefined();
      expect(basicTool.description).toContain('Search buildings using text-based filters');
      expect(basicTool.inputSchema.type).toBe('object');
      expect(basicTool.inputSchema.properties).toHaveProperty('cadastral_code');
      expect(basicTool.inputSchema.properties).toHaveProperty('municipality_code');
      expect(basicTool.inputSchema.properties).toHaveProperty('name');
      expect(basicTool.inputSchema.properties).toHaveProperty('building_type');
      expect(basicTool.inputSchema.properties).toHaveProperty('address');
      
      // Verify spatial search tool
      const spatialTool = buildingsTools.find((tool: any) => tool.name === 'search_buildings_spatial');
      expect(spatialTool).toBeDefined();
      expect(spatialTool.description).toContain('Search buildings using spatial polygon intersection');
      expect(spatialTool.inputSchema.type).toBe('object');
      expect(spatialTool.inputSchema.properties).toHaveProperty('polygon');
      expect(spatialTool.inputSchema.required).toContain('polygon');
    });
  });

  describe('MCP Tool Execution', () => {
    beforeEach(async () => {
      // Clean up test data
      await databaseService.queryNone('DELETE FROM public.buildings WHERE cadastral_code LIKE $1', ['TEST_%']);
      
      // Insert test building data
      await databaseService.queryNone(`
        INSERT INTO public.buildings (
          id, cadastral_code, municipality_code, name, building_type, address, 
          geom, basic_data, visible, created_at, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 
          ST_GeomFromText($7, 4326), $8, $9, $10, $11
        )
      `, [
        'test-building-1',
        'TEST_CAD001',
        'TEST_MUN001',
        'Test Building One',
        'residential',
        '123 Test Street',
        'POINT(12.4924 41.8902)',
        JSON.stringify({ floors: 3, year_built: 2020 }),
        true,
        new Date(),
        'test-user'
      ]);

      await databaseService.queryNone(`
        INSERT INTO public.buildings (
          id, cadastral_code, municipality_code, name, building_type, address, 
          geom, basic_data, visible, created_at, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 
          ST_GeomFromText($7, 4326), $8, $9, $10, $11
        )
      `, [
        'test-building-2',
        'TEST_CAD002',
        'TEST_MUN001',
        'Test Building Two',
        'commercial',
        '456 Test Avenue',
        'POINT(12.5000 41.9000)',
        JSON.stringify({ floors: 5, year_built: 2018 }),
        true,
        new Date(),
        'test-user'
      ]);
    });

    afterEach(async () => {
      // Clean up test data
      await databaseService.queryNone('DELETE FROM public.buildings WHERE cadastral_code LIKE $1', ['TEST_%']);
    });

    describe('search_buildings_basic tool', () => {
      it('should search buildings by cadastral code', async () => {
        const response = await request(app.getHttpServer())
          .post('/mcapi/mcp/tools/call')
          .send({
            name: 'search_buildings_basic',
            arguments: {
              cadastral_code: 'TEST_CAD001'
            }
          })
          .expect(200);

        expect(response.body.content).toBeDefined();
        expect(response.body.content).toHaveLength(1);
        expect(response.body.content[0].type).toBe('text');
        
        const buildings = JSON.parse(response.body.content[0].text);
        expect(buildings).toHaveLength(1);
        expect(buildings[0].cadastral_code).toBe('TEST_CAD001');
        expect(buildings[0].name).toBe('Test Building One');
        expect(buildings[0].geometry).toBeDefined();
        expect(buildings[0].geometry.type).toBe('Point');
      });

      it('should search buildings by municipality code', async () => {
        const response = await request(app.getHttpServer())
          .post('/mcapi/mcp/tools/call')
          .send({
            name: 'search_buildings_basic',
            arguments: {
              municipality_code: 'TEST_MUN001'
            }
          })
          .expect(200);

        const buildings = JSON.parse(response.body.content[0].text);
        expect(buildings).toHaveLength(2);
        expect(buildings.every((b: any) => b.municipality_code === 'TEST_MUN001')).toBe(true);
      });

      it('should search buildings by partial name', async () => {
        const response = await request(app.getHttpServer())
          .post('/mcapi/mcp/tools/call')
          .send({
            name: 'search_buildings_basic',
            arguments: {
              name: 'One'
            }
          })
          .expect(200);

        const buildings = JSON.parse(response.body.content[0].text);
        expect(buildings).toHaveLength(1);
        expect(buildings[0].name).toBe('Test Building One');
      });

      it('should search buildings by building type', async () => {
        const response = await request(app.getHttpServer())
          .post('/mcapi/mcp/tools/call')
          .send({
            name: 'search_buildings_basic',
            arguments: {
              building_type: 'commercial'
            }
          })
          .expect(200);

        const buildings = JSON.parse(response.body.content[0].text);
        expect(buildings).toHaveLength(1);
        expect(buildings[0].building_type).toBe('commercial');
        expect(buildings[0].name).toBe('Test Building Two');
      });

      it('should search buildings by partial address', async () => {
        const response = await request(app.getHttpServer())
          .post('/mcapi/mcp/tools/call')
          .send({
            name: 'search_buildings_basic',
            arguments: {
              address: 'Avenue'
            }
          })
          .expect(200);

        const buildings = JSON.parse(response.body.content[0].text);
        expect(buildings).toHaveLength(1);
        expect(buildings[0].address).toBe('456 Test Avenue');
      });

      it('should combine multiple filters', async () => {
        const response = await request(app.getHttpServer())
          .post('/mcapi/mcp/tools/call')
          .send({
            name: 'search_buildings_basic',
            arguments: {
              municipality_code: 'TEST_MUN001',
              building_type: 'residential'
            }
          })
          .expect(200);

        const buildings = JSON.parse(response.body.content[0].text);
        expect(buildings).toHaveLength(1);
        expect(buildings[0].municipality_code).toBe('TEST_MUN001');
        expect(buildings[0].building_type).toBe('residential');
      });

      it('should return empty array when no matches found', async () => {
        const response = await request(app.getHttpServer())
          .post('/mcapi/mcp/tools/call')
          .send({
            name: 'search_buildings_basic',
            arguments: {
              cadastral_code: 'NONEXISTENT'
            }
          })
          .expect(200);

        const buildings = JSON.parse(response.body.content[0].text);
        expect(buildings).toHaveLength(0);
      });
    });

    describe('search_buildings_spatial tool', () => {
      it('should search buildings by spatial polygon intersection', async () => {
        // Create a polygon that includes both test buildings
        const polygon = 'POLYGON((12.4 41.8, 12.6 41.8, 12.6 42.0, 12.4 42.0, 12.4 41.8))';
        
        const response = await request(app.getHttpServer())
          .post('/mcapi/mcp/tools/call')
          .send({
            name: 'search_buildings_spatial',
            arguments: {
              polygon: polygon
            }
          })
          .expect(200);

        const buildings = JSON.parse(response.body.content[0].text);
        expect(buildings).toHaveLength(2);
        expect(buildings.every((b: any) => b.geometry)).toBe(true);
      });

      it('should search buildings by smaller polygon', async () => {
        // Create a polygon that includes only the first building
        const polygon = 'POLYGON((12.4 41.8, 12.495 41.8, 12.495 41.895, 12.4 41.895, 12.4 41.8))';
        
        const response = await request(app.getHttpServer())
          .post('/mcapi/mcp/tools/call')
          .send({
            name: 'search_buildings_spatial',
            arguments: {
              polygon: polygon
            }
          })
          .expect(200);

        const buildings = JSON.parse(response.body.content[0].text);
        expect(buildings).toHaveLength(1);
        expect(buildings[0].cadastral_code).toBe('TEST_CAD001');
      });

      it('should return empty array for non-intersecting polygon', async () => {
        // Create a polygon that doesn't intersect with any buildings
        const polygon = 'POLYGON((10.0 40.0, 10.1 40.0, 10.1 40.1, 10.0 40.1, 10.0 40.0))';
        
        const response = await request(app.getHttpServer())
          .post('/mcapi/mcp/tools/call')
          .send({
            name: 'search_buildings_spatial',
            arguments: {
              polygon: polygon
            }
          })
          .expect(200);

        const buildings = JSON.parse(response.body.content[0].text);
        expect(buildings).toHaveLength(0);
      });

      it('should handle invalid WKT polygon format', async () => {
        const response = await request(app.getHttpServer())
          .post('/mcapi/mcp/tools/call')
          .send({
            name: 'search_buildings_spatial',
            arguments: {
              polygon: 'INVALID_WKT'
            }
          })
          .expect(200);

        const result = JSON.parse(response.body.content[0].text);
        expect(result.error).toBe('Failed to search buildings spatially');
        expect(result.message).toContain('Invalid WKT polygon format');
      });

      it('should require polygon parameter', async () => {
        const response = await request(app.getHttpServer())
          .post('/mcapi/mcp/tools/call')
          .send({
            name: 'search_buildings_spatial',
            arguments: {}
          })
          .expect(200);

        const result = JSON.parse(response.body.content[0].text);
        expect(result.error).toBe('Failed to search buildings spatially');
        expect(result.message).toContain('polygon parameter is required');
      });
    });

    describe('Error Handling', () => {
      it('should handle unknown tool names', async () => {
        const response = await request(app.getHttpServer())
          .post('/mcapi/mcp/tools/call')
          .send({
            name: 'unknown_tool',
            arguments: {}
          })
          .expect(500);

        expect(response.body.message).toContain('Unknown tool: unknown_tool');
      });
    });
  });
});