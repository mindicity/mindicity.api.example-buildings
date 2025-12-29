import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { BuildingsService } from '../buildings.service';
import { BuildingQuery, GeospatialQuery } from '../interfaces';

/**
 * MCP tool for buildings module - HTTP transport.
 * Provides building search and retrieval functionality for AI agents via MCP HTTP protocol.
 */
export class BuildingsMcpHttpTool {
  constructor(private readonly buildingsService: BuildingsService) {}

  /**
   * Get buildings list tool with comprehensive filtering and pagination support.
   * Returns building data with text-based filtering capabilities.
   * 
   * @param args - Tool arguments containing filter and pagination parameters
   * @returns CallToolResult with building data array
   */
  async get_buildings_list(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      const query: BuildingQuery = {
        name: args.name as string | undefined,
        building_type: args.building_type as string | undefined,
        address: args.address as string | undefined,
        cadastral_code: args.cadastral_code as string | undefined,
        municipality_code: args.municipality_code as string | undefined,
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      };

      const buildings = await this.buildingsService.findAll(query);
      const total = await this.buildingsService.countTotal(query);
      const paginationMeta = this.buildingsService.calculatePaginationMeta(query, total);

      const response = {
        buildings,
        pagination: paginationMeta,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to retrieve buildings',
              message: error instanceof Error ? error.message : 'Unknown error',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Search buildings by geospatial polygon intersection.
   * Returns buildings whose geometry intersects with the provided WKT polygon.
   * 
   * @param args - Tool arguments containing polygon and optional filters
   * @returns CallToolResult with building data array
   */
  async search_buildings_geospatial(args: Record<string, unknown>): Promise<CallToolResult> {
    try {
      if (!args.polygon || typeof args.polygon !== 'string') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Invalid polygon parameter',
                message: 'Polygon parameter is required and must be a valid WKT polygon string',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const query: GeospatialQuery = {
        polygon: args.polygon as string,
        name: args.name as string | undefined,
        building_type: args.building_type as string | undefined,
        address: args.address as string | undefined,
        cadastral_code: args.cadastral_code as string | undefined,
        municipality_code: args.municipality_code as string | undefined,
        limit: args.limit as number | undefined,
        offset: args.offset as number | undefined,
      };

      const buildings = await this.buildingsService.findByPolygon(query);
      const total = await this.buildingsService.countTotalByPolygon(query);
      const paginationMeta = this.buildingsService.calculatePaginationMeta(query, total);

      const response = {
        buildings,
        pagination: paginationMeta,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to search buildings by geospatial criteria',
              message: error instanceof Error ? error.message : 'Unknown error',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Get tool definitions for buildings module.
   * Returns comprehensive tool definitions with detailed descriptions and usage guidance.
   * 
   * @returns Array of detailed tool definitions with usage information
   */
  static getToolDefinitions(): Array<{
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
    usage?: {
      purpose: string;
      when_to_use: string[];
      response_format: string;
      interpretation: Record<string, string>;
      examples: Array<{
        scenario: string;
        expected_result: string;
      }>;
    };
  }> {
    return [
      {
        name: 'get_buildings_list',
        description: `Retrieve buildings with comprehensive filtering and pagination support via HTTP transport.

This tool provides access to building data including:
- Building identification (id, cadastral_code, municipality_code)
- Property information (name, building_type, address)
- Geospatial data (geometry in GeoJSON format)
- Metadata (basic_data JSONB, timestamps, visibility)

Supports text-based filtering on all string columns and pagination for large datasets. All returned buildings are visible (active) by default.`,
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter by building name (partial match, case-insensitive)',
            },
            building_type: {
              type: 'string',
              description: 'Filter by building type (exact match)',
            },
            address: {
              type: 'string',
              description: 'Filter by address (partial match, case-insensitive)',
            },
            cadastral_code: {
              type: 'string',
              description: 'Filter by cadastral code (exact match)',
            },
            municipality_code: {
              type: 'string',
              description: 'Filter by municipality code (exact match)',
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              description: 'Number of results to return (default: 20, max: 100)',
            },
            offset: {
              type: 'number',
              minimum: 0,
              description: 'Number of results to skip for pagination (default: 0)',
            },
          },
          required: [],
        },
        usage: {
          purpose: 'Retrieve and filter building data via HTTP transport',
          when_to_use: [
            'When searching for buildings by property characteristics',
            'For building management and administrative tasks',
            'During data analysis and reporting workflows',
            'To verify building existence before other operations',
            'For paginated building lists in user interfaces',
          ],
          response_format: 'JSON object with buildings array and pagination metadata',
          interpretation: {
            visible: 'true = building is active and visible, false = hidden/archived',
            geom: 'GeoJSON Point geometry in WGS84 (EPSG:4326) coordinate system',
            basic_data: 'JSONB object containing additional building metadata',
            created_at: 'Building record creation timestamp in ISO 8601 format',
            updated_at: 'Last modification timestamp, null if never updated',
            pagination: 'Metadata with total count, limit, offset, hasNext, hasPrevious flags',
          },
          examples: [
            {
              scenario: 'Search residential buildings in specific municipality',
              expected_result: 'List of buildings with building_type matching criteria and municipality_code filter',
            },
            {
              scenario: 'Paginated building list for administrative interface',
              expected_result: 'Limited number of buildings based on limit/offset parameters with pagination metadata',
            },
            {
              scenario: 'Find buildings by partial name match',
              expected_result: 'Buildings where name contains the search term (case-insensitive)',
            },
          ],
        },
      },
      {
        name: 'search_buildings_geospatial',
        description: `Search buildings by geospatial polygon intersection via HTTP transport.

This tool finds buildings whose geometry intersects with a provided WKT polygon. It supports:
- Polygon-based spatial filtering using PostGIS ST_Intersects
- Combination of spatial and text-based filters
- WKT (Well-Known Text) polygon format input
- All standard building data fields in response
- Pagination for large spatial query results

The polygon must be provided in valid WKT format (e.g., 'POLYGON((lon1 lat1, lon2 lat2, ...))') using WGS84 coordinates.`,
        inputSchema: {
          type: 'object',
          properties: {
            polygon: {
              type: 'string',
              description: 'WKT polygon string for spatial intersection (required). Format: POLYGON((lon1 lat1, lon2 lat2, lon3 lat3, lon1 lat1))',
              pattern: '^POLYGON\\(\\(.*\\)\\)$',
            },
            name: {
              type: 'string',
              description: 'Filter by building name (partial match, case-insensitive)',
            },
            building_type: {
              type: 'string',
              description: 'Filter by building type (exact match)',
            },
            address: {
              type: 'string',
              description: 'Filter by address (partial match, case-insensitive)',
            },
            cadastral_code: {
              type: 'string',
              description: 'Filter by cadastral code (exact match)',
            },
            municipality_code: {
              type: 'string',
              description: 'Filter by municipality code (exact match)',
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              description: 'Number of results to return (default: 20, max: 100)',
            },
            offset: {
              type: 'number',
              minimum: 0,
              description: 'Number of results to skip for pagination (default: 0)',
            },
          },
          required: ['polygon'],
        },
        usage: {
          purpose: 'Find buildings within specific geographic areas using spatial intersection',
          when_to_use: [
            'When searching for buildings within a specific geographic boundary',
            'For location-based analysis and reporting',
            'During urban planning and zoning operations',
            'To find buildings affected by geographic events or policies',
            'For map-based building selection and visualization',
          ],
          response_format: 'JSON object with buildings array (intersecting polygon) and pagination metadata',
          interpretation: {
            polygon: 'WKT polygon in WGS84 coordinates (longitude, latitude pairs)',
            intersection: 'Buildings returned have geometry that intersects with the provided polygon',
            geom: 'GeoJSON Point geometry showing exact building location',
            spatial_accuracy: 'Results based on PostGIS ST_Intersects function with high precision',
            coordinate_system: 'All coordinates in WGS84 (EPSG:4326) format',
          },
          examples: [
            {
              scenario: 'Find buildings in city center area',
              expected_result: 'Buildings whose geometry intersects with the city center polygon boundary',
            },
            {
              scenario: 'Combined spatial and type filtering',
              expected_result: 'Residential buildings within the specified polygon area',
            },
            {
              scenario: 'Large area search with pagination',
              expected_result: 'Paginated results of buildings within a large geographic polygon',
            },
          ],
        },
      },
    ];
  }
}