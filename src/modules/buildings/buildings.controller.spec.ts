import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { ContextUtil } from '../../common/utils/context.util';

import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { BuildingData, PaginationMeta } from './interfaces';
import { QueryBuildingsDto, GeospatialQueryDto, BuildingResponseDto, PaginatedBuildingsResponseDto } from './dto';

// Mock ContextUtil
jest.mock('../../common/utils/context.util');

describe('BuildingsController', () => {
  let controller: BuildingsController;
  let service: BuildingsService;
  let logger: ContextLoggerService;

  const mockContextLogger = {
    setContext: jest.fn(),
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  };

  const mockBuildingData: BuildingData = {
    id: 'test-id-1',
    cadastral_code: 'CAD001',
    municipality_code: 'MUN001',
    name: 'Test Building',
    building_type: 'residential',
    address: '123 Test Street',
    geom: { type: 'Point', coordinates: [1, 1] },
    basic_data: { floors: 2 },
    visible: true,
    created_at: new Date('2023-01-01T00:00:00Z'),
    updated_at: new Date('2023-01-02T00:00:00Z'),
    updated_by: 'test-user',
  };

  const mockBuildingsService = {
    findAll: jest.fn(),
    countTotal: jest.fn(),
    findByPolygon: jest.fn(),
    countTotalByPolygon: jest.fn(),
  };

  beforeEach(async () => {
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
    logger = module.get<ContextLoggerService>(ContextLoggerService);

    // Reset service mocks
    mockBuildingsService.findAll.mockReset();
    mockBuildingsService.countTotal.mockReset();
    mockBuildingsService.findByPolygon.mockReset();
    mockBuildingsService.countTotalByPolygon.mockReset();
    
    // Reset other logger methods but not setContext
    mockContextLogger.trace.mockReset();
    mockContextLogger.debug.mockReset();
    mockContextLogger.info.mockReset();
    mockContextLogger.warn.mockReset();
    mockContextLogger.error.mockReset();
    mockContextLogger.fatal.mockReset();
    
    // Mock ContextUtil methods
    (ContextUtil.getCorrelationId as jest.Mock).mockReturnValue('test-correlation-id');
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have service injected', () => {
      expect(service).toBeDefined();
    });

    it('should set logger context', () => {
      expect(logger.setContext).toHaveBeenCalledWith('BuildingsController');
    });
  });

  describe('findAll', () => {
    describe('Text-based queries', () => {
      it('should return paginated buildings for text query', async () => {
        // Arrange
        const query: QueryBuildingsDto = {
          name: 'Test',
          limit: 10,
          offset: 0,
        };

        const mockBuildings = [mockBuildingData];
        const mockTotalCount = 1;

        mockBuildingsService.findAll.mockResolvedValue(mockBuildings);
        mockBuildingsService.countTotal.mockResolvedValue(mockTotalCount);

        // Act
        const result = await controller.findAll(query);

        // Assert
        expect(result).toEqual({
          data: [{
            id: 'test-id-1',
            cadastral_code: 'CAD001',
            municipality_code: 'MUN001',
            name: 'Test Building',
            building_type: 'residential',
            address: '123 Test Street',
            geom: { type: 'Point', coordinates: [1, 1] },
            basic_data: { floors: 2 },
            visible: true,
            created_at: '2023-01-01T00:00:00.000Z',
            updated_at: '2023-01-02T00:00:00.000Z',
            updated_by: 'test-user',
          }],
          meta: {
            total: 1,
            limit: 10,
            offset: 0,
            hasNext: false,
            hasPrevious: false,
          },
        });

        expect(mockBuildingsService.findAll).toHaveBeenCalledWith(query);
        expect(mockBuildingsService.countTotal).toHaveBeenCalledWith(query);
        expect(logger.trace).toHaveBeenCalledWith('findAll()', expect.any(Object));
        expect(logger.debug).toHaveBeenCalledWith('executing text-based query', expect.any(Object));
        expect(logger.debug).toHaveBeenCalledWith('buildings retrieved successfully', expect.any(Object));
      });

      it('should handle empty results', async () => {
        // Arrange
        const query: QueryBuildingsDto = {
          name: 'NonExistent',
          limit: 20,
          offset: 0,
        };

        mockBuildingsService.findAll.mockResolvedValue([]);
        mockBuildingsService.countTotal.mockResolvedValue(0);

        // Act
        const result = await controller.findAll(query);

        // Assert
        expect(result).toEqual({
          data: [],
          meta: {
            total: 0,
            limit: 20,
            offset: 0,
            hasNext: false,
            hasPrevious: false,
          },
        });
      });

      it('should use default pagination values', async () => {
        // Arrange
        const query: QueryBuildingsDto = {
          limit: 20,
          offset: 0,
        };

        mockBuildingsService.findAll.mockResolvedValue([mockBuildingData]);
        mockBuildingsService.countTotal.mockResolvedValue(1);

        // Act
        const result = await controller.findAll(query);

        // Assert
        expect(result.meta).toEqual({
          total: 1,
          limit: 20, // default
          offset: 0,  // default
          hasNext: false,
          hasPrevious: false,
        });
      });

      it('should calculate pagination metadata correctly', async () => {
        // Arrange
        const query: QueryBuildingsDto = {
          limit: 5,
          offset: 10,
        };

        mockBuildingsService.findAll.mockResolvedValue([mockBuildingData]);
        mockBuildingsService.countTotal.mockResolvedValue(25);

        // Act
        const result = await controller.findAll(query);

        // Assert
        expect(result.meta).toEqual({
          total: 25,
          limit: 5,
          offset: 10,
          hasNext: true,  // 10 + 5 < 25
          hasPrevious: true, // 10 > 0
        });
      });
    });

    describe('Geospatial queries', () => {
      it('should return paginated buildings for geospatial query', async () => {
        // Arrange
        const query: GeospatialQueryDto = {
          polygon: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))',
          limit: 10,
          offset: 0,
        };

        const mockBuildings = [mockBuildingData];
        const mockTotalCount = 1;

        mockBuildingsService.findByPolygon.mockResolvedValue(mockBuildings);
        mockBuildingsService.countTotalByPolygon.mockResolvedValue(mockTotalCount);

        // Act
        const result = await controller.findAll(query);

        // Assert
        expect(result.data).toHaveLength(1);
        expect(result.meta.total).toBe(1);

        expect(mockBuildingsService.findByPolygon).toHaveBeenCalledWith(query);
        expect(mockBuildingsService.countTotalByPolygon).toHaveBeenCalledWith(query);
        expect(logger.debug).toHaveBeenCalledWith('executing geospatial query', expect.any(Object));
      });

      it('should handle combined geospatial and text filters', async () => {
        // Arrange
        const query: GeospatialQueryDto = {
          polygon: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))',
          name: 'Test',
          building_type: 'residential',
          limit: 10,
          offset: 0,
        };

        mockBuildingsService.findByPolygon.mockResolvedValue([mockBuildingData]);
        mockBuildingsService.countTotalByPolygon.mockResolvedValue(1);

        // Act
        const result = await controller.findAll(query);

        // Assert
        expect(mockBuildingsService.findByPolygon).toHaveBeenCalledWith(query);
        expect(mockBuildingsService.countTotalByPolygon).toHaveBeenCalledWith(query);
      });
    });

    describe('Error handling', () => {
      it('should handle WKT validation errors', async () => {
        // Arrange
        const query: GeospatialQueryDto = {
          polygon: 'INVALID_WKT',
          limit: 20,
          offset: 0,
        };

        const error = new Error('Invalid WKT polygon format');
        mockBuildingsService.findByPolygon.mockRejectedValue(error);

        // Act & Assert
        await expect(controller.findAll(query)).rejects.toThrow(HttpException);

        try {
          await controller.findAll(query);
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          expect((e as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
          expect((e as HttpException).getResponse()).toEqual({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Invalid WKT polygon format',
            error: 'Bad Request',
            details: 'Invalid WKT polygon format',
          });
        }

        expect(logger.error).toHaveBeenCalledWith('failed to retrieve buildings', expect.any(Object));
      });

      it('should handle validation errors', async () => {
        // Arrange
        const query: QueryBuildingsDto = {
          name: 'Test',
          limit: 20,
          offset: 0,
        };

        const error = new Error('validation failed for parameter');
        mockBuildingsService.findAll.mockRejectedValue(error);

        // Act & Assert
        try {
          await controller.findAll(query);
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          expect((e as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
          expect((e as HttpException).getResponse()).toEqual({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Validation error',
            error: 'Bad Request',
            details: 'validation failed for parameter',
          });
        }
      });

      it('should handle database errors', async () => {
        // Arrange
        const query: QueryBuildingsDto = {
          name: 'Test',
          limit: 20,
          offset: 0,
        };

        const error = new Error('database connection failed');
        mockBuildingsService.findAll.mockRejectedValue(error);

        // Act & Assert
        try {
          await controller.findAll(query);
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          expect((e as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect((e as HttpException).getResponse()).toEqual({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Database error occurred',
            error: 'Internal Server Error',
          });
        }
      });

      it('should handle unexpected errors', async () => {
        // Arrange
        const query: QueryBuildingsDto = {
          name: 'Test',
          limit: 20,
          offset: 0,
        };

        const error = new Error('unexpected error');
        mockBuildingsService.findAll.mockRejectedValue(error);

        // Act & Assert
        try {
          await controller.findAll(query);
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          expect((e as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect((e as HttpException).getResponse()).toEqual({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred',
            error: 'Internal Server Error',
          });
        }
      });
    });

    describe('DTO conversion', () => {
      it('should convert BuildingData to BuildingResponseDto correctly', async () => {
        // Arrange
        const query: QueryBuildingsDto = {
          limit: 20,
          offset: 0,
        };
        const buildingWithNullUpdatedAt: BuildingData = {
          ...mockBuildingData,
          updated_at: null,
        };

        mockBuildingsService.findAll.mockResolvedValue([buildingWithNullUpdatedAt]);
        mockBuildingsService.countTotal.mockResolvedValue(1);

        // Act
        const result = await controller.findAll(query);

        // Assert
        expect(result.data[0]).toEqual({
          id: 'test-id-1',
          cadastral_code: 'CAD001',
          municipality_code: 'MUN001',
          name: 'Test Building',
          building_type: 'residential',
          address: '123 Test Street',
          geom: { type: 'Point', coordinates: [1, 1] },
          basic_data: { floors: 2 },
          visible: true,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: null, // Should handle null values
          updated_by: 'test-user',
        });
      });
    });

    describe('Query sanitization for logging', () => {
      it('should sanitize polygon in query for logging', async () => {
        // Arrange
        const query: GeospatialQueryDto = {
          polygon: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))',
          limit: 20,
          offset: 0,
        };

        mockBuildingsService.findByPolygon.mockResolvedValue([]);
        mockBuildingsService.countTotalByPolygon.mockResolvedValue(0);

        // Act
        await controller.findAll(query);

        // Assert
        expect(logger.trace).toHaveBeenCalledWith('findAll()', {
          query: {
            polygon: '[WKT_POLYGON]', // Should be sanitized
            limit: 20,
            offset: 0,
          },
          correlationId: 'test-correlation-id',
        });
      });

      it('should not sanitize non-polygon queries', async () => {
        // Arrange
        const query: QueryBuildingsDto = {
          name: 'Test Building',
          building_type: 'residential',
          limit: 20,
          offset: 0,
        };

        mockBuildingsService.findAll.mockResolvedValue([]);
        mockBuildingsService.countTotal.mockResolvedValue(0);

        // Act
        await controller.findAll(query);

        // Assert
        expect(logger.trace).toHaveBeenCalledWith('findAll()', {
          query: {
            name: 'Test Building',
            building_type: 'residential',
            limit: 20,
            offset: 0,
          },
          correlationId: 'test-correlation-id',
        });
      });
    });
  });
});
