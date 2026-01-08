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
   * Supports text filtering and spatial polygon filtering.
   * @param query - The query parameters for filtering buildings
   * @returns Promise resolving to array of building data
   */
  async findAll(query: BuildingsQuery): Promise<BuildingData[]> {
    this.logger.trace('findAll()', { query });

    try {
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
        .where('visible = $1', [true]);

      // Add text filters
      let paramIndex = 2; // Start from 2 since visible=true uses $1

      if (query.cadastral_code) {
        queryBuilder = queryBuilder.where(`cadastral_code = $${paramIndex}`, [query.cadastral_code]);
        paramIndex++;
      }

      if (query.municipality_code) {
        queryBuilder = queryBuilder.where(`municipality_code = $${paramIndex}`, [query.municipality_code]);
        paramIndex++;
      }

      if (query.building_type) {
        queryBuilder = queryBuilder.where(`building_type = $${paramIndex}`, [query.building_type]);
        paramIndex++;
      }

      if (query.name) {
        queryBuilder = queryBuilder.where(`name ILIKE $${paramIndex}`, [`%${query.name}%`]);
        paramIndex++;
      }

      if (query.address) {
        queryBuilder = queryBuilder.where(`address ILIKE $${paramIndex}`, [`%${query.address}%`]);
        paramIndex++;
      }

      // Add spatial filter if polygon is provided
      if (query.polygon) {
        // Validate and add spatial intersection query
        queryBuilder = queryBuilder.where(
          `ST_Intersects(geom, ST_GeomFromText($${paramIndex}, 4326))`,
          [query.polygon]
        );
        paramIndex++;
      }

      // Order by creation date for consistent results
      queryBuilder = queryBuilder.orderBy('created_at', 'DESC');

      const { query: sql, params } = queryBuilder.build();

      const results = await this.databaseService.queryMany<any>(sql, params);

      // Transform results to proper format
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
      this.logger.error('failed to retrieve buildings', {
        err: error,
        correlationId: ContextUtil.getCorrelationId()
      });
      throw error;
    }
  }
}