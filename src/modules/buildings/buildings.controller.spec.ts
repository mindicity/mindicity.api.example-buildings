import { Test, TestingModule } from '@nestjs/testing';

import { ContextLoggerService } from '../../common/services/context-logger.service';

import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { QueryBuildingsDto, BuildingResponseDto, QueryBuildingsPaginatedDto, BuildingsPaginatedResponseDto } from './dto';

describe('BuildingsController', () => {
  let controller: BuildingsController;
  let service: BuildingsService;

  const mockBuilding = {
    id: '1',
    cadastral_code: 'TEST001',
    municipality_code: 'MUN001',
    name: 'Test Building',
    building_type: 'residential',
    address: '123 Test St',
    geometry: { type: 'Point', coordinates: [0, 0] },
    basic_data: { floors: 2 },
    visible: true,
    created_at: new Date('2023-01-01'),
    updated_at: new Date('2023-01-02'),
    updated_by: 'test-user',
  };

  const mockBuildingsService = {
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
  };

  beforeEach(async () => {
    const mockContextLogger = {
      setContext: jest.fn(),
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuildingsController],
      providers: [
        {
          provide: BuildingsService,
          useValue: mockBuildingsService,
        },
        {
          provide: ContextLoggerService,
          useValue: mockContextLogger,
        },
      ],
    }).compile();

    controller = module.get<BuildingsController>(BuildingsController);
    service = module.get<BuildingsService>(BuildingsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have service injected', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of buildings', async () => {
      const query: QueryBuildingsDto = {
        cadastral_code: 'TEST001',
        municipality_code: 'MUN001',
        building_type: 'residential',
        name: 'test',
      };

      const expectedResponse = [{
        id: mockBuilding.id,
        cadastral_code: mockBuilding.cadastral_code,
        municipality_code: mockBuilding.municipality_code,
        name: mockBuilding.name,
        building_type: mockBuilding.building_type,
        address: mockBuilding.address,
        geometry: mockBuilding.geometry,
        basic_data: mockBuilding.basic_data,
        visible: mockBuilding.visible,
        created_at: mockBuilding.created_at.toISOString(),
        updated_at: mockBuilding.updated_at?.toISOString(),
        updated_by: mockBuilding.updated_by,
      }];

      mockBuildingsService.findAll.mockResolvedValue([mockBuilding]);

      const result = await controller.findAll(query);

      expect(mockBuildingsService.findAll).toHaveBeenCalledWith({
        cadastral_code: query.cadastral_code,
        municipality_code: query.municipality_code,
        building_type: query.building_type,
        name: query.name,
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated buildings with metadata', async () => {
      const query: QueryBuildingsPaginatedDto = {
        limit: 10,
        offset: 0,
        name: 'test',
      };

      const mockPaginatedResult = {
        data: [mockBuilding],
        meta: {
          total: 1,
          limit: 10,
          offset: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };

      const expectedResponse: BuildingsPaginatedResponseDto = {
        data: [{
          id: mockBuilding.id,
          cadastral_code: mockBuilding.cadastral_code,
          municipality_code: mockBuilding.municipality_code,
          name: mockBuilding.name,
          building_type: mockBuilding.building_type,
          address: mockBuilding.address,
          geometry: mockBuilding.geometry,
          basic_data: mockBuilding.basic_data,
          visible: mockBuilding.visible,
          created_at: mockBuilding.created_at.toISOString(),
          updated_at: mockBuilding.updated_at?.toISOString(),
          updated_by: mockBuilding.updated_by,
        }],
        meta: mockPaginatedResult.meta,
      };

      mockBuildingsService.findAllPaginated.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAllPaginated(query);

      expect(mockBuildingsService.findAllPaginated).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResponse);
    });
  });
});
