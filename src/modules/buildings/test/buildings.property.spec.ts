import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';

import { ContextLoggerService } from '../../../common/services/context-logger.service';
import { DatabaseService } from '../../../infrastructure/database/database.service';
import { BuildingsService } from '../buildings.service';
import { BuildingQuery } from '../interfaces';

/**
 * Property-based tests for Buildings API module structure.
 * Validates universal correctness properties across all valid inputs.
 * 
 * **Feature: buildings-api, Property 1: Complete Response Structure**
 * Validates: Requirements 1.3, 1.5, 8.4
 */
describe('Buildings API Property Tests', () => {
  let service: BuildingsService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;

  beforeEach(async () => {
    const mockContextLogger = {
      child: jest.fn().mockReturnThis(),
      setContext: jest.fn(),
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    mockDatabaseService = {
      queryMany: jest.fn(),
      query: jest.fn(),
      queryOne: jest.fn(),
      transaction: jest.fn(),
      getPoolStatus: jest.fn(),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuildingsService,
        {
          provide: ContextLoggerService,
          useValue: mockContextLogger,
        },
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<BuildingsService>(BuildingsService);
  });

  /**
   * Property 1: Complete Response Structure
   * 
   * For any valid building query, the API response should include all required fields
   * (id, cadastral_code, municipality_code, name, building_type, address, geom, 
   * basic_data, visible, created_at, updated_at, updated_by) in valid JSON format 
   * with proper data types.
   * 
   * Validates: Requirements 1.3, 1.5, 8.4
   */
  it('Property 1: Complete Response Structure', async () => {
    // Mock database response with complete building data
    const mockBuildingData = [
      {
        id: 'building-123',
        cadastral_code: 'CAD001',
        municipality_code: 'MUN001',
        name: 'Test Building',
        building_type: 'residential',
        address: '123 Test Street',
        geom: '{"type":"Point","coordinates":[12.4924,41.8902]}',
        basic_data: { floors: 3, year_built: 2020 },
        visible: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        updated_by: 'system',
      },
      {
        id: 'building-456',
        cadastral_code: 'CAD002',
        municipality_code: 'MUN002',
        name: null, // Test nullable field
        building_type: 'commercial',
        address: '456 Business Ave',
        geom: null, // Test nullable geometry
        basic_data: {},
        visible: true,
        created_at: '2023-02-01T00:00:00Z',
        updated_at: null, // Test nullable field
        updated_by: null, // Test nullable field
      },
    ];

    mockDatabaseService.queryMany.mockResolvedValue(mockBuildingData);

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          building_type: fc.option(fc.constantFrom('residential', 'commercial', 'industrial', 'mixed'), { nil: undefined }),
          address: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          cadastral_code: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          municipality_code: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
          offset: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
        }),
        async (query: BuildingQuery) => {
          const response = await service.findAll(query);

          // Verify response is an array
          expect(Array.isArray(response)).toBe(true);

          // Verify each building has all required fields with correct types
          response.forEach(building => {
            // Required string fields
            expect(typeof building.id).toBe('string');
            expect(building.id).toBeTruthy();
            expect(typeof building.cadastral_code).toBe('string');
            expect(building.cadastral_code).toBeTruthy();
            expect(typeof building.municipality_code).toBe('string');
            expect(building.municipality_code).toBeTruthy();
            expect(typeof building.building_type).toBe('string');
            expect(building.building_type).toBeTruthy();
            expect(typeof building.address).toBe('string');
            expect(building.address).toBeTruthy();

            // Nullable string field
            expect(building.name === null || typeof building.name === 'string').toBe(true);

            // Geospatial field (nullable GeoJSON Point)
            if (building.geom !== null) {
              expect(typeof building.geom).toBe('object');
              expect(building.geom.type).toBe('Point');
              expect(Array.isArray(building.geom.coordinates)).toBe(true);
              expect(building.geom.coordinates).toHaveLength(2);
              expect(typeof building.geom.coordinates[0]).toBe('number');
              expect(typeof building.geom.coordinates[1]).toBe('number');
            }

            // JSONB field
            expect(typeof building.basic_data).toBe('object');
            expect(building.basic_data).not.toBeNull();

            // Boolean field
            expect(typeof building.visible).toBe('boolean');

            // Date fields
            expect(building.created_at instanceof Date).toBe(true);
            expect(building.updated_at === null || building.updated_at instanceof Date).toBe(true);

            // Nullable string field
            expect(building.updated_by === null || typeof building.updated_by === 'string').toBe(true);

            // Verify all required properties exist
            expect(building).toHaveProperty('id');
            expect(building).toHaveProperty('cadastral_code');
            expect(building).toHaveProperty('municipality_code');
            expect(building).toHaveProperty('name');
            expect(building).toHaveProperty('building_type');
            expect(building).toHaveProperty('address');
            expect(building).toHaveProperty('geom');
            expect(building).toHaveProperty('basic_data');
            expect(building).toHaveProperty('visible');
            expect(building).toHaveProperty('created_at');
            expect(building).toHaveProperty('updated_at');
            expect(building).toHaveProperty('updated_by');
          });

          // Verify database service was called with proper SQL query
          expect(mockDatabaseService.queryMany).toHaveBeenCalled();
          const [sql, params] = mockDatabaseService.queryMany.mock.calls[mockDatabaseService.queryMany.mock.calls.length - 1];
          
          // Verify SQL includes all required fields
          expect(sql).toContain('id');
          expect(sql).toContain('cadastral_code');
          expect(sql).toContain('municipality_code');
          expect(sql).toContain('name');
          expect(sql).toContain('building_type');
          expect(sql).toContain('address');
          expect(sql).toContain('ST_AsGeoJSON(geom)');
          expect(sql).toContain('basic_data');
          expect(sql).toContain('visible');
          expect(sql).toContain('created_at');
          expect(sql).toContain('updated_at');
          expect(sql).toContain('updated_by');
          
          // Verify visibility filter is always applied (Requirement 8.3)
          expect(sql).toContain('visible = $1');
          if (params && params.length > 0) {
            expect(params[0]).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});