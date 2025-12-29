import { Injectable } from '@nestjs/common';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { ContextUtil } from '../../common/utils/context.util';
import { SqlQueryBuilder } from '../../common/utils/sql-query-builder.util';
import { DatabaseService } from '../../infrastructure/database/database.service';

import { BuildingData, BuildingQuery, GeospatialQuery } from './interfaces';

/**
 * BuildingsService provides building data retrieval functionality with automatic correlation logging.
 * Demonstrates how to use ContextLoggerService for consistent logging across services.
 */
@Injectable()
export class BuildingsService {
  private readonly logger: ContextLoggerService;

  /**
   * Creates an instance of BuildingsService with a child logger.
   * @param loggerService - The context logger service for logging operations
   * @param databaseService - The database service for PostGIS queries
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
   * Retrieve buildings with optional filtering and pagination.
   * @param query - Building query parameters for filtering and pagination
   * @returns Promise resolving to array of building data
   */
  async findAll(query: BuildingQuery): Promise<BuildingData[]> {
    this.logger.trace('findAll()', { query });

    try {
      // Build base query using SqlQueryBuilder
      let queryBuilder = SqlQueryBuilder
        .create()
        .select([
          'id',
          'cadastral_code',
          'municipality_code',
          'name',
          'building_type',
          'address',
          'ST_AsGeoJSON(geom) as geom',
          'basic_data',
          'visible',
          'created_at',
          'updated_at',
          'updated_by'
        ])
        .from('public.buildings')
        .where('visible = $1', [true]);

      // Add text filters
      let paramIndex = 2;
      if (query.name) {
        queryBuilder = queryBuilder.andWhere(`name ILIKE $${paramIndex}`, [`%${query.name}%`]);
        paramIndex++;
      }
      if (query.building_type) {
        queryBuilder = queryBuilder.andWhere(`building_type = $${paramIndex}`, [query.building_type]);
        paramIndex++;
      }
      if (query.address) {
        queryBuilder = queryBuilder.andWhere(`address ILIKE $${paramIndex}`, [`%${query.address}%`]);
        paramIndex++;
      }
      if (query.cadastral_code) {
        queryBuilder = queryBuilder.andWhere(`cadastral_code = $${paramIndex}`, [query.cadastral_code]);
        paramIndex++;
      }
      if (query.municipality_code) {
        queryBuilder = queryBuilder.andWhere(`municipality_code = $${paramIndex}`, [query.municipality_code]);
        paramIndex++;
      }

      // Add pagination
      queryBuilder = queryBuilder
        .orderBy('created_at', 'DESC')
        .limit(query.limit ?? 20)
        .offset(query.offset ?? 0);

      const { query: sql, params } = queryBuilder.build();

      const results = await this.databaseService.queryMany<Record<string, unknown>>(sql, params);

      // Transform results to BuildingData format
      const buildings: BuildingData[] = results.map(row => ({
        id: row.id as string,
        cadastral_code: row.cadastral_code as string,
        municipality_code: row.municipality_code as string,
        name: row.name as string | null,
        building_type: row.building_type as string,
        address: row.address as string,
        geom: row.geom ? JSON.parse(row.geom as string) : null,
        basic_data: (row.basic_data as Record<string, unknown>) ?? {},
        visible: row.visible as boolean,
        created_at: new Date(row.created_at as string),
        updated_at: row.updated_at ? new Date(row.updated_at as string) : null,
        updated_by: row.updated_by as string | null,
      }));

      this.logger.debug('buildings retrieved', {
        count: buildings.length,
        correlationId: ContextUtil.getCorrelationId()
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

  /**
   * Retrieve buildings that intersect with a given polygon using PostGIS spatial operations.
   * Uses raw SQL for complex PostGIS ST_Intersects functionality.
   * @param query - Geospatial query parameters including WKT polygon and optional filters
   * @returns Promise resolving to array of building data
   */
  async findByPolygon(query: GeospatialQuery): Promise<BuildingData[]> {
    this.logger.trace('findByPolygon()', { query: { ...query, polygon: '[WKT_POLYGON]' } });

    try {
      // Build raw SQL query for PostGIS spatial intersection
      // This requires raw SQL because SqlQueryBuilder doesn't support PostGIS functions
      let sql = `
        SELECT 
          id,
          cadastral_code,
          municipality_code,
          name,
          building_type,
          address,
          ST_AsGeoJSON(geom) as geom,
          basic_data,
          visible,
          created_at,
          updated_at,
          updated_by
        FROM public.buildings 
        WHERE visible = $1 
          AND ST_Intersects(geom, ST_GeomFromText($2, 4326))
      `;

      const params: unknown[] = [true, query.polygon];
      let paramIndex = 3;

      // Add text filters
      if (query.name) {
        sql += ` AND name ILIKE $${paramIndex}`;
        params.push(`%${query.name}%`);
        paramIndex++;
      }
      if (query.building_type) {
        sql += ` AND building_type = $${paramIndex}`;
        params.push(query.building_type);
        paramIndex++;
      }
      if (query.address) {
        sql += ` AND address ILIKE $${paramIndex}`;
        params.push(`%${query.address}%`);
        paramIndex++;
      }
      if (query.cadastral_code) {
        sql += ` AND cadastral_code = $${paramIndex}`;
        params.push(query.cadastral_code);
        paramIndex++;
      }
      if (query.municipality_code) {
        sql += ` AND municipality_code = $${paramIndex}`;
        params.push(query.municipality_code);
        paramIndex++;
      }

      // Add ordering and pagination
      sql += ` ORDER BY created_at DESC`;
      
      if (query.limit) {
        sql += ` LIMIT $${paramIndex}`;
        params.push(query.limit);
        paramIndex++;
      }
      
      if (query.offset) {
        sql += ` OFFSET $${paramIndex}`;
        params.push(query.offset);
      }

      const results = await this.databaseService.queryMany<Record<string, unknown>>(sql, params);

      // Transform results to BuildingData format
      const buildings: BuildingData[] = results.map(row => ({
        id: row.id as string,
        cadastral_code: row.cadastral_code as string,
        municipality_code: row.municipality_code as string,
        name: row.name as string | null,
        building_type: row.building_type as string,
        address: row.address as string,
        geom: row.geom ? JSON.parse(row.geom as string) : null,
        basic_data: (row.basic_data as Record<string, unknown>) ?? {},
        visible: row.visible as boolean,
        created_at: new Date(row.created_at as string),
        updated_at: row.updated_at ? new Date(row.updated_at as string) : null,
        updated_by: row.updated_by as string | null,
      }));

      this.logger.debug('buildings retrieved by polygon intersection', {
        count: buildings.length,
        correlationId: ContextUtil.getCorrelationId()
      });

      return buildings;
    } catch (error) {
      this.logger.error('failed to retrieve buildings by polygon', {
        err: error,
        correlationId: ContextUtil.getCorrelationId()
      });
      throw error;
    }
  }

  /**
   * Count total number of buildings matching the given query criteria.
   * Used for pagination metadata calculation.
   * @param query - Building query parameters for filtering (without pagination)
   * @returns Promise resolving to total count of matching buildings
   */
  async countTotal(query: Omit<BuildingQuery, 'limit' | 'offset'>): Promise<number> {
    this.logger.trace('countTotal()', { query });

    try {
      // Build count query using SqlQueryBuilder
      let queryBuilder = SqlQueryBuilder
        .create()
        .select(['COUNT(*) as total'])
        .from('public.buildings')
        .where('visible = $1', [true]);

      // Add text filters (same logic as findAll but without pagination)
      let paramIndex = 2;
      if (query.name) {
        queryBuilder = queryBuilder.andWhere(`name ILIKE $${paramIndex}`, [`%${query.name}%`]);
        paramIndex++;
      }
      if (query.building_type) {
        queryBuilder = queryBuilder.andWhere(`building_type = $${paramIndex}`, [query.building_type]);
        paramIndex++;
      }
      if (query.address) {
        queryBuilder = queryBuilder.andWhere(`address ILIKE $${paramIndex}`, [`%${query.address}%`]);
        paramIndex++;
      }
      if (query.cadastral_code) {
        queryBuilder = queryBuilder.andWhere(`cadastral_code = $${paramIndex}`, [query.cadastral_code]);
        paramIndex++;
      }
      if (query.municipality_code) {
        queryBuilder = queryBuilder.andWhere(`municipality_code = $${paramIndex}`, [query.municipality_code]);
        paramIndex++;
      }

      const { query: sql, params } = queryBuilder.build();

      const result = await this.databaseService.queryOne<{ total: string }>(sql, params);
      const total = parseInt(result?.total ?? '0', 10);

      this.logger.debug('buildings count retrieved', {
        total,
        correlationId: ContextUtil.getCorrelationId()
      });

      return total;
    } catch (error) {
      this.logger.error('failed to count buildings', {
        err: error,
        correlationId: ContextUtil.getCorrelationId()
      });
      throw error;
    }
  }

  /**
   * Count total number of buildings matching the given geospatial query criteria.
   * Used for pagination metadata calculation with polygon filtering.
   * @param query - Geospatial query parameters for filtering (without pagination)
   * @returns Promise resolving to total count of matching buildings
   */
  async countTotalByPolygon(query: Omit<GeospatialQuery, 'limit' | 'offset'>): Promise<number> {
    this.logger.trace('countTotalByPolygon()', { query: { ...query, polygon: '[WKT_POLYGON]' } });

    try {
      // Build raw SQL count query for PostGIS spatial intersection
      let sql = `
        SELECT COUNT(*) as total
        FROM public.buildings 
        WHERE visible = $1 
          AND ST_Intersects(geom, ST_GeomFromText($2, 4326))
      `;

      const params: unknown[] = [true, query.polygon];
      let paramIndex = 3;

      // Add text filters
      if (query.name) {
        sql += ` AND name ILIKE $${paramIndex}`;
        params.push(`%${query.name}%`);
        paramIndex++;
      }
      if (query.building_type) {
        sql += ` AND building_type = $${paramIndex}`;
        params.push(query.building_type);
        paramIndex++;
      }
      if (query.address) {
        sql += ` AND address ILIKE $${paramIndex}`;
        params.push(`%${query.address}%`);
        paramIndex++;
      }
      if (query.cadastral_code) {
        sql += ` AND cadastral_code = $${paramIndex}`;
        params.push(query.cadastral_code);
        paramIndex++;
      }
      if (query.municipality_code) {
        sql += ` AND municipality_code = $${paramIndex}`;
        params.push(query.municipality_code);
        paramIndex++;
      }

      const result = await this.databaseService.queryOne<{ total: string }>(sql, params);
      const total = parseInt(result?.total ?? '0', 10);

      this.logger.debug('buildings count by polygon retrieved', {
        total,
        correlationId: ContextUtil.getCorrelationId()
      });

      return total;
    } catch (error) {
      this.logger.error('failed to count buildings by polygon', {
        err: error,
        correlationId: ContextUtil.getCorrelationId()
      });
      throw error;
    }
  }
}
