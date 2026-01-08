import { Test, TestingModule } from '@nestjs/testing';

import { ContextLoggerService } from '../../../common/services/context-logger.service';
import { BuildingsService } from '../buildings.service';
import { BuildingData } from '../interfaces';

import { BuildingsMcpHttpTool } from './buildings-mcp-http.tool';

describe('BuildingsMcpHttpTool', () => {
  let tool: BuildingsMcpHttpTool;
  let buildingsService: jest.Mocked<BuildingsService>;
  let logger: jest.Mocked<ContextLoggerService>;

  const mockBuildingData: BuildingData = {
    id: 'test-id-1',
    cadastral_code: 'CAD001',
    municipality_code: 'MUN001',
    name: 'Test Building',
    building_type: 'residential',
    address: '123 Test Street',
    geometry: {
      type: 'Point',
      coordinates: [12.4924, 41.8902],
    },
    basic_data: { floors: 3, year_built: 2020 },
    visible: true,
    created_at: new Date('2023-01-01T00:00:00Z'),
    updated_at: new Date('2023-06-01T00:00:00Z'),
    updated_by: 'test-user',
  };

  beforeEach(async () => {
    const mockBuildingsService = {
      findAll: jest.fn(),
    };

    const mockLogger = {
      child: jest.fn().mockReturnThis(),
      trace: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: BuildingsService,
          useValue: mockBuildingsService,
        },
        {
          provide: ContextLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    buildingsService = module.get<BuildingsService>(BuildingsService) as jest.Mocked<BuildingsService>;
    logger = module.get<ContextLoggerService>(ContextLoggerService) as jest.Mocked<ContextLoggerService>;
    
    tool = new BuildingsMcpHttpTool(buildingsService, logger);
  });

  describe('searchBuildingsBasic', () => {
    it('should search buildings with text filters', async () => {
      // Arrange
      const args = {
        cadastral_code: 'CAD001',
        municipality_code: 'MUN001',
        name: 'Test',
        building_type: 'residential',
        address: 'Street',
      };
      
      buildingsService.findAll.mockResolvedValue([mockBuildingData]);

      // Act
      const result = await tool.searchBuildingsBasic(args);

      // Assert
      expect(logger.trace).toHaveBeenCalledWith('searchBuildingsBasic()', { args });
      expect(buildingsService.findAll).toHaveBeenCalledWith({
        cadastral_code: 'CAD001',
        municipality_code: 'MUN001',
        name: 'Test',
        building_type: 'residential',
        address: 'Street',
      });
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect((result.content[0] as any).text).toContain('test-id-1');
      expect((result.content[0] as any).text).toContain('CAD001');
    });

    it('should handle empty arguments', async () => {
      // Arrange
      const args = {};
      buildingsService.findAll.mockResolvedValue([]);

      // Act
      const result = await tool.searchBuildingsBasic(args);

      // Assert
      expect(buildingsService.findAll).toHaveBeenCalledWith({});
      expect((result.content[0] as any).text).toBe('[]');
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const args = { cadastral_code: 'CAD001' };
      const error = new Error('Database connection failed');
      buildingsService.findAll.mockRejectedValue(error);

      // Act
      const result = await tool.searchBuildingsBasic(args);

      // Assert
      expect(logger.error).toHaveBeenCalledWith('Error in searchBuildingsBasic', { err: error, args });
      expect((result.content[0] as any).text).toContain('Failed to search buildings');
      expect((result.content[0] as any).text).toContain('Database connection failed');
    });

    it('should filter out invalid argument types', async () => {
      // Arrange
      const args = {
        cadastral_code: 'CAD001',
        municipality_code: 123, // Invalid type
        name: null, // Invalid type
        building_type: 'residential',
        address: undefined, // Invalid type
      };
      
      buildingsService.findAll.mockResolvedValue([]);

      // Act
      const result = await tool.searchBuildingsBasic(args);

      // Assert
      expect(buildingsService.findAll).toHaveBeenCalledWith({
        cadastral_code: 'CAD001',
        building_type: 'residential',
      });
    });
  });

  describe('searchBuildingsSpatial', () => {
    it('should search buildings with spatial polygon', async () => {
      // Arrange
      const args = {
        polygon: 'POLYGON((12.4 41.8, 12.5 41.8, 12.5 41.9, 12.4 41.9, 12.4 41.8))',
      };
      
      buildingsService.findAll.mockResolvedValue([mockBuildingData]);

      // Act
      const result = await tool.searchBuildingsSpatial(args);

      // Assert
      expect(logger.trace).toHaveBeenCalledWith('searchBuildingsSpatial()', { args });
      expect(buildingsService.findAll).toHaveBeenCalledWith({
        polygon: 'POLYGON((12.4 41.8, 12.5 41.8, 12.5 41.9, 12.4 41.9, 12.4 41.8))',
      });
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect((result.content[0] as any).text).toContain('test-id-1');
    });

    it('should require polygon parameter', async () => {
      // Arrange
      const args = {};

      // Act
      const result = await tool.searchBuildingsSpatial(args);

      // Assert
      expect((result.content[0] as any).text).toContain('polygon parameter is required');
      expect(buildingsService.findAll).not.toHaveBeenCalled();
    });

    it('should validate polygon parameter type', async () => {
      // Arrange
      const args = { polygon: 123 };

      // Act
      const result = await tool.searchBuildingsSpatial(args);

      // Assert
      expect((result.content[0] as any).text).toContain('polygon parameter is required and must be a valid WKT POLYGON string');
      expect(buildingsService.findAll).not.toHaveBeenCalled();
    });

    it('should handle spatial query errors', async () => {
      // Arrange
      const args = {
        polygon: 'POLYGON((12.4 41.8, 12.5 41.8, 12.5 41.9, 12.4 41.9, 12.4 41.8))',
      };
      const error = new Error('Invalid WKT polygon format');
      buildingsService.findAll.mockRejectedValue(error);

      // Act
      const result = await tool.searchBuildingsSpatial(args);

      // Assert
      expect(logger.error).toHaveBeenCalledWith('Error in searchBuildingsSpatial', { err: error, args });
      expect((result.content[0] as any).text).toContain('Failed to search buildings spatially');
      expect((result.content[0] as any).text).toContain('Invalid WKT polygon format');
    });
  });

  describe('getToolDefinitions', () => {
    it('should return comprehensive tool definitions', () => {
      // Act
      const definitions = BuildingsMcpHttpTool.getToolDefinitions();

      // Assert
      expect(definitions).toHaveLength(2);
      
      // Check basic search tool
      const basicTool = definitions.find(tool => tool.name === 'search_buildings_basic');
      expect(basicTool).toBeDefined();
      expect(basicTool!.description).toContain('Search buildings using text-based filters');
      expect(basicTool!.inputSchema.type).toBe('object');
      expect(basicTool!.inputSchema.properties).toHaveProperty('cadastral_code');
      expect(basicTool!.inputSchema.properties).toHaveProperty('municipality_code');
      expect(basicTool!.inputSchema.properties).toHaveProperty('name');
      expect(basicTool!.inputSchema.properties).toHaveProperty('building_type');
      expect(basicTool!.inputSchema.properties).toHaveProperty('address');
      expect(basicTool!.inputSchema.required).toEqual([]);
      expect(basicTool!.usage).toBeDefined();
      expect(basicTool!.usage!.purpose).toContain('HTTP transport');
      
      // Check spatial search tool
      const spatialTool = definitions.find(tool => tool.name === 'search_buildings_spatial');
      expect(spatialTool).toBeDefined();
      expect(spatialTool!.description).toContain('Search buildings using spatial polygon intersection');
      expect(spatialTool!.inputSchema.type).toBe('object');
      expect(spatialTool!.inputSchema.properties).toHaveProperty('polygon');
      expect(spatialTool!.inputSchema.required).toEqual(['polygon']);
      expect(spatialTool!.usage).toBeDefined();
      expect(spatialTool!.usage!.purpose).toContain('PostGIS');
    });

    it('should include comprehensive usage information', () => {
      // Act
      const definitions = BuildingsMcpHttpTool.getToolDefinitions();

      // Assert
      definitions.forEach(tool => {
        expect(tool.usage).toBeDefined();
        expect(tool.usage!.purpose).toBeTruthy();
        expect(tool.usage!.when_to_use).toBeInstanceOf(Array);
        expect(tool.usage!.when_to_use.length).toBeGreaterThan(0);
        expect(tool.usage!.response_format).toBeTruthy();
        expect(tool.usage!.interpretation).toBeDefined();
        expect(tool.usage!.examples).toBeInstanceOf(Array);
        expect(tool.usage!.examples.length).toBeGreaterThan(0);
      });
    });
  });
});