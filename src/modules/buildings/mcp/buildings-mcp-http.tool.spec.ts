import { Test, TestingModule } from '@nestjs/testing';

import { BuildingsService } from '../buildings.service';
import { BuildingData, BuildingQuery, GeospatialQuery } from '../interfaces';

import { BuildingsMcpHttpTool } from './buildings-mcp-http.tool';

describe('BuildingsMcpHttpTool', () => {
  let tool: BuildingsMcpHttpTool;
  let buildingsService: jest.Mocked<BuildingsService>;

  const mockBuildingData: BuildingData = {
    id: 'test-building-1',
    cadastral_code: 'CAD001',
    municipality_code: 'MUN001',
    name: 'Test Building',
    building_type: 'residential',
    address: '123 Test Street',
    geom: { type: 'Point', coordinates: [12.4924, 41.8902] },
    basic_data: { floors: 3 },
    visible: true,
    created_at: new Date('2023-01-01T00:00:00Z'),
    updated_at: new Date('2023-06-01T00:00:00Z'),
    updated_by: 'test-user',
  };

  beforeEach(async () => {
    const mockBuildingsService = {
      findAll: jest.fn(),
      findByPolygon: jest.fn(),
      countTotal: jest.fn(),
      countTotalByPolygon: jest.fn(),
      calculatePaginationMeta: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: BuildingsService,
          useValue: mockBuildingsService,
        },
      ],
    }).compile();

    buildingsService = module.get<BuildingsService>(BuildingsService) as jest.Mocked<BuildingsService>;
    tool = new BuildingsMcpHttpTool(buildingsService);
  });

  describe('get_buildings_list', () => {
    it('should return buildings with pagination metadata', async () => {
      const mockArgs: Record<string, unknown> = { limit: 10, offset: 0 };
      const mockBuildings = [mockBuildingData];
      const mockTotal = 1;
      const mockPagination = {
        total: 1,
        limit: 10,
        offset: 0,
        hasNext: false,
        hasPrevious: false,
      };

      buildingsService.findAll.mockResolvedValue(mockBuildings);
      buildingsService.countTotal.mockResolvedValue(mockTotal);
      buildingsService.calculatePaginationMeta.mockReturnValue(mockPagination);

      const result = await tool.get_buildings_list(mockArgs);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const textContent = result.content[0] as { type: 'text'; text: string };
      const responseData = JSON.parse(textContent.text);
      expect(responseData.buildings).toEqual(mockBuildings);
      expect(responseData.pagination).toEqual(mockPagination);
      
      expect(buildingsService.findAll).toHaveBeenCalledWith({
        name: undefined,
        building_type: undefined,
        address: undefined,
        cadastral_code: undefined,
        municipality_code: undefined,
        limit: 10,
        offset: 0,
      });
      expect(buildingsService.countTotal).toHaveBeenCalledWith({
        name: undefined,
        building_type: undefined,
        address: undefined,
        cadastral_code: undefined,
        municipality_code: undefined,
        limit: 10,
        offset: 0,
      });
    });

    it('should handle service errors gracefully', async () => {
      const mockArgs: Record<string, unknown> = { limit: 10, offset: 0 };
      const errorMessage = 'Database connection failed';

      buildingsService.findAll.mockRejectedValue(new Error(errorMessage));

      const result = await tool.get_buildings_list(mockArgs);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      
      const textContent = result.content[0] as { type: 'text'; text: string };
      const responseData = JSON.parse(textContent.text);
      expect(responseData.error).toBe('Failed to retrieve buildings');
      expect(responseData.message).toBe(errorMessage);
    });

    it('should pass through filter parameters correctly', async () => {
      const mockArgs: Record<string, unknown> = {
        name: 'Test Building',
        building_type: 'residential',
        address: 'Test Street',
        cadastral_code: 'CAD001',
        municipality_code: 'MUN001',
        limit: 20,
        offset: 10,
      };

      buildingsService.findAll.mockResolvedValue([mockBuildingData]);
      buildingsService.countTotal.mockResolvedValue(1);
      buildingsService.calculatePaginationMeta.mockReturnValue({
        total: 1,
        limit: 20,
        offset: 10,
        hasNext: false,
        hasPrevious: true,
      });

      await tool.get_buildings_list(mockArgs);

      expect(buildingsService.findAll).toHaveBeenCalledWith({
        name: 'Test Building',
        building_type: 'residential',
        address: 'Test Street',
        cadastral_code: 'CAD001',
        municipality_code: 'MUN001',
        limit: 20,
        offset: 10,
      });
      expect(buildingsService.countTotal).toHaveBeenCalledWith({
        name: 'Test Building',
        building_type: 'residential',
        address: 'Test Street',
        cadastral_code: 'CAD001',
        municipality_code: 'MUN001',
        limit: 20,
        offset: 10,
      });
    });
  });

  describe('search_buildings_geospatial', () => {
    it('should return buildings within polygon with pagination metadata', async () => {
      const mockArgs: Record<string, unknown> = {
        polygon: 'POLYGON((12.4920 41.8902, 12.4925 41.8902, 12.4925 41.8907, 12.4920 41.8907, 12.4920 41.8902))',
        limit: 10,
        offset: 0,
      };
      const mockBuildings = [mockBuildingData];
      const mockTotal = 1;
      const mockPagination = {
        total: 1,
        limit: 10,
        offset: 0,
        hasNext: false,
        hasPrevious: false,
      };

      buildingsService.findByPolygon.mockResolvedValue(mockBuildings);
      buildingsService.countTotalByPolygon.mockResolvedValue(mockTotal);
      buildingsService.calculatePaginationMeta.mockReturnValue(mockPagination);

      const result = await tool.search_buildings_geospatial(mockArgs);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const textContent = result.content[0] as { type: 'text'; text: string };
      const responseData = JSON.parse(textContent.text);
      expect(responseData.buildings).toEqual(mockBuildings);
      expect(responseData.pagination).toEqual(mockPagination);
      
      expect(buildingsService.findByPolygon).toHaveBeenCalledWith({
        polygon: 'POLYGON((12.4920 41.8902, 12.4925 41.8902, 12.4925 41.8907, 12.4920 41.8907, 12.4920 41.8902))',
        name: undefined,
        building_type: undefined,
        address: undefined,
        cadastral_code: undefined,
        municipality_code: undefined,
        limit: 10,
        offset: 0,
      });
      expect(buildingsService.countTotalByPolygon).toHaveBeenCalledWith({
        polygon: 'POLYGON((12.4920 41.8902, 12.4925 41.8902, 12.4925 41.8907, 12.4920 41.8907, 12.4920 41.8902))',
        name: undefined,
        building_type: undefined,
        address: undefined,
        cadastral_code: undefined,
        municipality_code: undefined,
        limit: 10,
        offset: 0,
      });
    });

    it('should return error when polygon parameter is missing', async () => {
      const mockArgs: Record<string, unknown> = { limit: 10, offset: 0 };

      const result = await tool.search_buildings_geospatial(mockArgs);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      
      const textContent = result.content[0] as { type: 'text'; text: string };
      const responseData = JSON.parse(textContent.text);
      expect(responseData.error).toBe('Invalid polygon parameter');
      expect(responseData.message).toBe('Polygon parameter is required and must be a valid WKT polygon string');
    });

    it('should return error when polygon parameter is not a string', async () => {
      const mockArgs: Record<string, unknown> = { polygon: 123, limit: 10, offset: 0 };

      const result = await tool.search_buildings_geospatial(mockArgs);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      
      const textContent = result.content[0] as { type: 'text'; text: string };
      const responseData = JSON.parse(textContent.text);
      expect(responseData.error).toBe('Invalid polygon parameter');
    });

    it('should handle service errors gracefully', async () => {
      const mockArgs: Record<string, unknown> = {
        polygon: 'POLYGON((12.4920 41.8902, 12.4925 41.8902, 12.4925 41.8907, 12.4920 41.8907, 12.4920 41.8902))',
        limit: 10,
        offset: 0,
      };
      const errorMessage = 'Invalid WKT polygon format';

      buildingsService.findByPolygon.mockRejectedValue(new Error(errorMessage));

      const result = await tool.search_buildings_geospatial(mockArgs);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      
      const textContent = result.content[0] as { type: 'text'; text: string };
      const responseData = JSON.parse(textContent.text);
      expect(responseData.error).toBe('Failed to search buildings by geospatial criteria');
      expect(responseData.message).toBe(errorMessage);
    });

    it('should pass through combined spatial and text filters correctly', async () => {
      const mockArgs: Record<string, unknown> = {
        polygon: 'POLYGON((12.4920 41.8902, 12.4925 41.8902, 12.4925 41.8907, 12.4920 41.8907, 12.4920 41.8902))',
        name: 'Test Building',
        building_type: 'residential',
        limit: 20,
        offset: 10,
      };

      buildingsService.findByPolygon.mockResolvedValue([mockBuildingData]);
      buildingsService.countTotalByPolygon.mockResolvedValue(1);
      buildingsService.calculatePaginationMeta.mockReturnValue({
        total: 1,
        limit: 20,
        offset: 10,
        hasNext: false,
        hasPrevious: true,
      });

      await tool.search_buildings_geospatial(mockArgs);

      expect(buildingsService.findByPolygon).toHaveBeenCalledWith({
        polygon: 'POLYGON((12.4920 41.8902, 12.4925 41.8902, 12.4925 41.8907, 12.4920 41.8907, 12.4920 41.8902))',
        name: 'Test Building',
        building_type: 'residential',
        address: undefined,
        cadastral_code: undefined,
        municipality_code: undefined,
        limit: 20,
        offset: 10,
      });
      expect(buildingsService.countTotalByPolygon).toHaveBeenCalledWith({
        polygon: 'POLYGON((12.4920 41.8902, 12.4925 41.8902, 12.4925 41.8907, 12.4920 41.8907, 12.4920 41.8902))',
        name: 'Test Building',
        building_type: 'residential',
        address: undefined,
        cadastral_code: undefined,
        municipality_code: undefined,
        limit: 20,
        offset: 10,
      });
    });
  });

  describe('getToolDefinitions', () => {
    it('should return comprehensive tool definitions', () => {
      const definitions = BuildingsMcpHttpTool.getToolDefinitions();

      expect(definitions).toHaveLength(2);
      
      // Check get_buildings_list tool
      const getBuildingsListTool = definitions.find(def => def.name === 'get_buildings_list');
      expect(getBuildingsListTool).toBeDefined();
      expect(getBuildingsListTool!.description).toContain('comprehensive filtering and pagination');
      expect(getBuildingsListTool!.inputSchema.properties).toHaveProperty('name');
      expect(getBuildingsListTool!.inputSchema.properties).toHaveProperty('building_type');
      expect(getBuildingsListTool!.inputSchema.properties).toHaveProperty('limit');
      expect(getBuildingsListTool!.inputSchema.required).toEqual([]);
      expect(getBuildingsListTool!.usage).toBeDefined();
      
      // Check search_buildings_geospatial tool
      const searchGeospatialTool = definitions.find(def => def.name === 'search_buildings_geospatial');
      expect(searchGeospatialTool).toBeDefined();
      expect(searchGeospatialTool!.description).toContain('geospatial polygon intersection');
      expect(searchGeospatialTool!.inputSchema.properties).toHaveProperty('polygon');
      expect(searchGeospatialTool!.inputSchema.required).toEqual(['polygon']);
      expect(searchGeospatialTool!.usage).toBeDefined();
    });

    it('should include detailed usage information for all tools', () => {
      const definitions = BuildingsMcpHttpTool.getToolDefinitions();

      definitions.forEach(definition => {
        expect(definition.usage).toBeDefined();
        expect(definition.usage!.purpose).toBeDefined();
        expect(definition.usage!.when_to_use).toBeInstanceOf(Array);
        expect(definition.usage!.response_format).toBeDefined();
        expect(definition.usage!.interpretation).toBeDefined();
        expect(definition.usage!.examples).toBeInstanceOf(Array);
        expect(definition.usage!.examples.length).toBeGreaterThan(0);
      });
    });
  });
});