import { Injectable } from '@nestjs/common';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { ContextUtil } from '../../common/utils/context.util';
import { SqlQueryBuilder } from '../../common/utils/sql-query-builder.util';
import { DatabaseService } from '../../infrastructure/database/database.service';

import { BuildingsQuery, BuildingData } from './interfaces';

/**
 * BuildingsService provides building data retrieval functionality with automatic correlation logging.
 * Implements PostGIS spatial queries and text filtering for building data.
 */
@Injectable()
export class BuildingsService {
  private readonly logger: ContextLoggerService;

  /**
   * Creates an instance of BuildingsService with a child logger.
   * @param loggerService - The context logger service for logging operations
   * @param databaseService - The database service for raw SQL queries
   */
  constructor(
    loggerService: ContextLoggerService,
    private readonly databaseService: DatabaseService,
  ) {
    // Create a child logger instance for this service with its own context
    this.logger = loggerService.child({ serviceContext: BuildingsService.name });
    this.logger.setContext(BuildingsService.name);
  }

  /**
   * Retrieves buildings based on provided query filters.
   * Supports text filtering and spatial polygon filtering with PostGIS.
   * @param query - The query parameters for filtering buildings
   * @returns Promise resolving to array of building data
   * @throws {Error} When spatial polygon format is invalid
   */
  async findAll(query: BuildingsQuery): Promise<BuildingData[]> {
    this.logger.trace('findAll()', { query });

    try {
      // Validate spatial polygon if provided
      if (query.polygon) {
        await this.validateWktPolygon(query.polygon);
      }

      // Build the base query with required fields
      let queryBuilder = SqlQueryBuilder
        .create()
        .select([
          'id',
          'cadastral_code',
          'municipality_code',
          'name',
          'building_type',
          'address',
          'ST_AsGeoJSON(geom) as geometry',
          'basic_data',
          'visible',
          'created_at',
          'updated_at',
          'updated_by'
        ])
        .from('public.buildings')
        .where('visible = $1', [true])
        .limit(1);

      // Add text filters
      if (query.cadastral_code) {
        queryBuilder = queryBuilder.andWhere('cadastral_code = $1', [query.cadastral_code]);
      }

      if (query.municipality_code) {
        queryBuilder = queryBuilder.andWhere('municipality_code = $1', [query.municipality_code]);
      }

      if (query.building_type) {
        queryBuilder = queryBuilder.andWhere('building_type = $1', [query.building_type]);
      }

      if (query.name) {
        queryBuilder = queryBuilder.andWhere('name ILIKE $1', [`%${query.name}%`]);
      }

      if (query.address) {
        queryBuilder = queryBuilder.andWhere('address ILIKE $1', [`%${query.address}%`]);
      }

      // Add spatial filter if polygon is provided
      if (query.polygon) {
        // Use ST_Intersects with ST_GeomFromText for spatial intersection in EPSG:4326
        queryBuilder = queryBuilder.andWhere(
          'ST_Intersects(geom, ST_GeomFromText($1, 4326))',
          [query.polygon]
        );
      }

      // Order by creation date for consistent results
      queryBuilder = queryBuilder.orderBy('created_at', 'DESC');

      const { query: sql, params } = queryBuilder.build();

      const results = await this.databaseService.queryMany<any>(sql, params);

      // Transform results to proper format with GeoJSON geometry
      const buildings: BuildingData[] = results.map(row => ({
        id: row.id,
        cadastral_code: row.cadastral_code,
        municipality_code: row.municipality_code,
        name: row.name,
        building_type: row.building_type,
        address: row.address,
        geometry: row.geometry ? JSON.parse(row.geometry) : undefined,
        basic_data: row.basic_data,
        visible: row.visible,
        created_at: row.created_at,
        updated_at: row.updated_at,
        updated_by: row.updated_by,
      }));

      // Log business context only
      this.logger.debug('buildings retrieved for business operation', {
        requestedBy: ContextUtil.getUserId(),
        correlationId: ContextUtil.getCorrelationId(),
        filterCriteria: {
          hasTextFilters: !!(query.cadastral_code || query.municipality_code || query.building_type || query.name || query.address),
          hasSpatialFilter: !!query.polygon,
          resultCount: buildings.length
        }
      });

      return buildings;
    } catch (error) {
      // Handle spatial query errors with descriptive messages
      if (error instanceof Error && error.message && error.message.includes('Invalid geometry')) {
        this.logger.error('invalid WKT polygon format provided', {
          polygon: query.polygon,
          correlationId: ContextUtil.getCorrelationId()
        });
        throw new Error('Invalid WKT polygon format. Please provide a valid WKT POLYGON string in EPSG:4326 coordinate system.');
      }

      this.logger.error('failed to retrieve buildings', {
        err: error,
        correlationId: ContextUtil.getCorrelationId()
      });
      throw error;
    }
  }

  /**
   * Validates WKT polygon format using PostGIS ST_GeomFromText function.
   * @param wktPolygon - WKT polygon string to validate
   * @throws {Error} When WKT polygon format is invalid
   */
  private async validateWktPolygon(wktPolygon: string): Promise<void> {
    this.logger.trace('validateWktPolygon()', { wktPolygon });

    try {
      // Use PostGIS to validate the WKT polygon format
      const validationResult = await this.databaseService.queryOne<{ is_valid: boolean }>(
        'SELECT ST_GeomFromText($1, 4326) IS NOT NULL as is_valid',
        [wktPolygon]
      );

      if (!validationResult?.is_valid) {
        throw new Error('Invalid WKT polygon format. Please provide a valid WKT POLYGON string.');
      }
    } catch (error) {
      this.logger.error('WKT polygon validation failed', {
        err: error,
        wktPolygon,
        correlationId: ContextUtil.getCorrelationId()
      });
      throw new Error('Invalid WKT polygon format. Please provide a valid WKT POLYGON string.');
    }
  }
}