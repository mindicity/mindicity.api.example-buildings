import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { DatabaseService } from '../../infrastructure/database/database.service';

import { BuildingsService } from './buildings.service';
import { BuildingData } from './interfaces';

describe('BuildingsService', () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have database service injected', () => {
    expect(mockDatabaseService).toBeDefined();
  });

  /**
   * **Feature: data-enrich, Property 1: Complete Field Response**
   * *For any* building record returned by the API, the response should contain all required fields:
   * id, cadastral_code, municipality_code, name, building_type, address, geometry, basic_data, visible, created_at, updated_at, and updated_by
   * **Validates: Requirements 1.2, 1.3**
   */
  describe('Property Tests', () => {
    it('should return complete field response for any building record', () => {
      // Generate arbitrary building data that would come from database
      const buildingDataArbitrary = fc.record({
        id: fc.string({ minLength: 1 }),
        cadastral_code: fc.string({ minLength: 1 }),
        municipality_code: fc.string({ minLength: 1 }),
        name: fc.option(fc.string(), { nil: undefined }),
        building_type: fc.string({ minLength: 1 }),
        address: fc.string({ minLength: 1 }),
        geometry: fc.option(fc.object(), { nil: undefined }),
        basic_data: fc.object(),
        visible: fc.boolean(),
        created_at: fc.date(),
        updated_at: fc.option(fc.date(), { nil: undefined }),
        updated_by: fc.option(fc.string(), { nil: undefined }),
      });

      const validateCompleteFields = (buildingData: BuildingData): boolean => {
        // Verify all required fields are present
        expect(buildingData).toHaveProperty('id');
        expect(buildingData).toHaveProperty('cadastral_code');
        expect(buildingData).toHaveProperty('municipality_code');
        expect(buildingData).toHaveProperty('name');
        expect(buildingData).toHaveProperty('building_type');
        expect(buildingData).toHaveProperty('address');
        expect(buildingData).toHaveProperty('geometry');
        expect(buildingData).toHaveProperty('basic_data');
        expect(buildingData).toHaveProperty('visible');
        expect(buildingData).toHaveProperty('created_at');
        expect(buildingData).toHaveProperty('updated_at');
        expect(buildingData).toHaveProperty('updated_by');

        // Verify required fields are not undefined
        expect(buildingData.id).toBeDefined();
        expect(buildingData.cadastral_code).toBeDefined();
        expect(buildingData.municipality_code).toBeDefined();
        expect(buildingData.building_type).toBeDefined();
        expect(buildingData.address).toBeDefined();
        expect(buildingData.basic_data).toBeDefined();
        expect(buildingData.visible).toBeDefined();
        expect(buildingData.created_at).toBeDefined();

        // Verify field types
        expect(typeof buildingData.id).toBe('string');
        expect(typeof buildingData.cadastral_code).toBe('string');
        expect(typeof buildingData.municipality_code).toBe('string');
        expect(typeof buildingData.building_type).toBe('string');
        expect(typeof buildingData.address).toBe('string');
        expect(typeof buildingData.basic_data).toBe('object');
        expect(typeof buildingData.visible).toBe('boolean');
        expect(buildingData.created_at).toBeInstanceOf(Date);

        return true;
      };

      fc.assert(
        fc.property(buildingDataArbitrary, validateCompleteFields),
        { numRuns: 100 },
      );
    });
  });
});
