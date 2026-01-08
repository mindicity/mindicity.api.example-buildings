import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { ContextLoggerService } from '../../../common/services/context-logger.service';
import { BuildingsService } from '../buildings.service';
import { BuildingsQuery } from '../interfaces';

/**
 * Buildings MCP HTTP Tool provides AI agents with building data retrieval capabilities.
 * 
 * This tool enables AI agents to:
 * - Search buildings using text filters (cadastral code, municipality, name, address, type)
 * - Perform spatial queries using WKT polygon intersection
 * - Retrieve comprehensive building data including GeoJSON geometry
 * - Access PostGIS spatial functionality through HTTP transport
 * 
 * The tool delegates all operations to BuildingsService, ensuring consistent
 * business logic between HTTP API endpoints and MCP tool calls.
 */
export class BuildingsMcpHttpTool {
  private readonly logger: ContextLoggerService;

  constructor(
    private readonly buildingsService: BuildingsService,
    loggerService: ContextLoggerService,
  ) {
    this.logger = loggerService.child({ serviceContext: 'BuildingsMcpHttpTool' });
  }

  /**
   * Search buildings using text-based filters.
   * Supports exact matching for codes and partial matching for text fields.
   * @param args - Tool arguments containing filter parameters
   * @returns CallToolResult with building data in JSON format
   */
  async searchBuildingsBasic(args: Record<string, unknown>): Promise<CallToolResult> {
    this.logger.trace('searchBuildingsBasic()', { args });

    try {
      // Build query from arguments
      const query: BuildingsQuery = {};
      
      if (args.cadastral_code && typeof args.cadastral_code === 'string') {
        query.cadastral_code = args.cadastral_code;
      }
      
      if (args.municipality_code && typeof args.municipality_code === 'string') {
        query.municipality_code = args.municipality_code;
      }
      
      if (args.name && typeof args.name === 'string') {
        query.name = args.name;
      }
      
      if (args.building_type && typeof args.building_type === 'string') {
        query.building_type = args.building_type;
      }
      
      if (args.address && typeof args.address === 'string') {
        query.address = args.address;
      }

      // Execute search through service
      const buildings = await this.buildingsService.findAll(query);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(buildings, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error in searchBuildingsBasic', { err: error, args });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to search buildings',
              message: error instanceof Error ? error.message : 'Unknown error',
            }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Search buildings using spatial polygon intersection.
   * Uses PostGIS ST_Intersects with WKT polygon input.
   * @param args - Tool arguments containing polygon parameter
   * @returns CallToolResult with building data in JSON format
   */
  async searchBuildingsSpatial(args: Record<string, unknown>): Promise<CallToolResult> {
    this.logger.trace('searchBuildingsSpatial()', { args });

    try {
      // Validate polygon parameter
      if (!args.polygon || typeof args.polygon !== 'string') {
        throw new Error('polygon parameter is required and must be a valid WKT POLYGON string');
      }

      // Build spatial query
      const query: BuildingsQuery = {
        polygon: args.polygon,
      };

      // Execute spatial search through service
      const buildings = await this.buildingsService.findAll(query);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(buildings, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error in searchBuildingsSpatial', { err: error, args });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to search buildings spatially',
              message: error instanceof Error ? error.message : 'Unknown error',
            }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Get comprehensive tool definitions for AI agents.
   * Provides detailed descriptions, input schemas, and usage guidance.
   * @returns Array of tool definitions with comprehensive metadata
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
      examples: Array<{ scenario: string; expected_result: string }>;
    };
  }> {
    return [
      {
        name: 'search_buildings_basic',
        description: `Search buildings using text-based filters with comprehensive building data retrieval.

This tool provides access to building information including:
- Cadastral and municipality identification codes
- Building names, types, and addresses
- GeoJSON geometry data for spatial visualization
- Basic building data and metadata
- Creation and modification timestamps

Supports multiple filter types:
- Exact matching for cadastral_code, municipality_code, building_type
- Partial case-insensitive matching for name and address (ILIKE)
- Multiple filters combined with AND logic
- Returns only visible buildings (visible=true)

Use this tool for building management, property searches, and administrative tasks.`,
        inputSchema: {
          type: 'object',
          properties: {
            cadastral_code: {
              type: 'string',
              description: 'Exact cadastral code for building identification',
            },
            municipality_code: {
              type: 'string',
              description: 'Exact municipality code for location filtering',
            },
            name: {
              type: 'string',
              description: 'Partial building name search (case-insensitive)',
            },
            building_type: {
              type: 'string',
              description: 'Exact building type classification',
            },
            address: {
              type: 'string',
              description: 'Partial address search (case-insensitive)',
            },
          },
          required: [],
        },
        usage: {
          purpose: 'Retrieve building data using text-based filters via HTTP transport',
          when_to_use: [
            'When searching for buildings by identification codes',
            'For property management and administrative tasks',
            'During building inventory and reporting workflows',
            'To find buildings by partial name or address matches',
            'For building type classification and analysis',
          ],
          response_format: 'Array of building objects with ID, codes, geometry (GeoJSON), and metadata',
          interpretation: {
            cadastral_code: 'Unique cadastral identification code for the building',
            municipality_code: 'Administrative municipality code where building is located',
            geometry: 'GeoJSON geometry object representing building footprint or location',
            basic_data: 'Additional building metadata and properties as JSON object',
            visible: 'Always true - only visible buildings are returned',
            created_at: 'Building record creation timestamp in ISO 8601 format',
            updated_at: 'Last modification timestamp, null if never updated',
          },
          examples: [
            {
              scenario: 'Find buildings by cadastral code',
              expected_result: 'List of buildings matching the exact cadastral code',
            },
            {
              scenario: 'Search buildings by partial name',
              expected_result: 'Buildings with names containing the search term (case-insensitive)',
            },
            {
              scenario: 'Filter by building type and municipality',
              expected_result: 'Buildings matching both the exact type and municipality code',
            },
          ],
        },
      },
      {
        name: 'search_buildings_spatial',
        description: `Search buildings using spatial polygon intersection with PostGIS capabilities.

This tool provides advanced spatial querying functionality:
- WKT (Well-Known Text) polygon input validation
- PostGIS ST_Intersects spatial intersection queries
- EPSG:4326 coordinate system support (WGS84 latitude/longitude)
- GeoJSON geometry output for spatial visualization
- Comprehensive building data for intersecting buildings

Spatial query process:
1. Validates WKT polygon format using PostGIS ST_GeomFromText
2. Performs spatial intersection using ST_Intersects function
3. Returns buildings whose geometry intersects with the input polygon
4. Converts building geometry to GeoJSON format for easy consumption

Use this tool for spatial analysis, geographic searches, and location-based queries.`,
        inputSchema: {
          type: 'object',
          properties: {
            polygon: {
              type: 'string',
              description: 'WKT POLYGON string in EPSG:4326 coordinate system (longitude, latitude)',
              pattern: '^POLYGON\\s*\\(\\(.+\\)\\)$',
            },
          },
          required: ['polygon'],
        },
        usage: {
          purpose: 'Retrieve buildings intersecting with a spatial polygon via HTTP transport using PostGIS',
          when_to_use: [
            'When performing spatial analysis and geographic searches',
            'For location-based building queries and mapping applications',
            'During urban planning and zoning analysis workflows',
            'To find buildings within specific geographic boundaries',
            'For spatial data integration and GIS applications',
          ],
          response_format: 'Array of building objects with GeoJSON geometry intersecting the input polygon',
          interpretation: {
            polygon: 'WKT POLYGON format: POLYGON((lon1 lat1, lon2 lat2, lon3 lat3, lon1 lat1))',
            geometry: 'GeoJSON geometry of buildings that spatially intersect with input polygon',
            intersection: 'Buildings returned have geometry that intersects (overlaps) with the query polygon',
            coordinate_system: 'All coordinates use EPSG:4326 (WGS84) longitude/latitude format',
          },
          examples: [
            {
              scenario: 'Find buildings in rectangular area',
              expected_result: 'Buildings whose geometry intersects with the rectangular polygon boundary',
            },
            {
              scenario: 'Search buildings in complex polygon zone',
              expected_result: 'All buildings that have any spatial overlap with the complex polygon area',
            },
            {
              scenario: 'Invalid WKT polygon format',
              expected_result: 'Error message explaining WKT polygon format requirements',
            },
          ],
        },
      },
    ];
  }
}