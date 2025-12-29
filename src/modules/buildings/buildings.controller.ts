import { Controller, Get, Query, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ZodError } from 'zod';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { ContextUtil } from '../../common/utils/context.util';
import { ValidationException } from '../../common/exceptions/validation.exception';
import { DatabaseException } from '../../common/exceptions/database.exception';
import { ROUTES } from '../../config/routes.config';

import { BuildingsService } from './buildings.service';
import { 
  QueryBuildingsDto, 
  GeospatialQueryDto, 
  BuildingResponseDto, 
  PaginatedBuildingsResponseDto 
} from './dto';
import { BuildingData, PaginationMeta } from './interfaces';
import { ValidationErrorHandler } from './exceptions/validation-error.handler';
import { DatabaseErrorHandler } from './exceptions/database-error.handler';

/**
 * Controller for Buildings API endpoints.
 * Uses ContextLoggerService for automatic correlation ID and user ID logging.
 */
@ApiTags('buildings')
@ApiBearerAuth()
@Controller(ROUTES.BUILDINGS)
export class BuildingsController {
  /**
   * Creates an instance of BuildingsController.
   * @param buildingsService - The buildings service for business logic
   * @param logger - The context logger service for logging operations
   */
  constructor(
    private readonly buildingsService: BuildingsService,
    private readonly logger: ContextLoggerService,
  ) {
    this.logger.setContext(BuildingsController.name);
  }

  /**
   * Get buildings with optional filtering and pagination.
   * Supports both text-based filtering and geospatial filtering via WKT polygon.
   * 
   * @param query - Query parameters for filtering and pagination
   * @returns Promise resolving to paginated buildings response
   */
  @Get()
  @ApiOperation({ 
    summary: 'Get buildings with filtering and pagination',
    description: `Retrieve buildings with comprehensive filtering options:
    
**Text Filtering:**
- name: Partial match on building name (case-insensitive)
- building_type: Exact match on building type (residential, commercial, industrial, mixed, other)
- address: Partial match on building address (case-insensitive)
- cadastral_code: Exact match on cadastral code
- municipality_code: Exact match on municipality code

**Geospatial Filtering:**
- polygon: WKT polygon for spatial intersection queries (e.g., "POLYGON((x1 y1, x2 y2, x3 y3, x1 y1))")

**Pagination:**
- limit: Number of results per page (1-100, default: 20)
- offset: Number of results to skip (default: 0)

All filters can be combined using AND logic. Only visible buildings are returned.`
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Buildings retrieved successfully',
    type: PaginatedBuildingsResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid query parameters (validation errors)'
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error'
  })
  @ApiQuery({ name: 'name', required: false, description: 'Filter by building name (partial match)' })
  @ApiQuery({ name: 'building_type', required: false, enum: ['residential', 'commercial', 'industrial', 'mixed', 'other'], description: 'Filter by building type' })
  @ApiQuery({ name: 'address', required: false, description: 'Filter by address (partial match)' })
  @ApiQuery({ name: 'cadastral_code', required: false, description: 'Filter by cadastral code (exact match)' })
  @ApiQuery({ name: 'municipality_code', required: false, description: 'Filter by municipality code (exact match)' })
  @ApiQuery({ name: 'polygon', required: false, description: 'WKT polygon for spatial filtering (e.g., "POLYGON((x1 y1, x2 y2, x3 y3, x1 y1))")' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results per page (1-100, default: 20)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of results to skip (default: 0)' })
  async findAll(@Query() query: QueryBuildingsDto | GeospatialQueryDto): Promise<PaginatedBuildingsResponseDto> {
    this.logger.trace('findAll()', { 
      query: this.sanitizeQueryForLogging(query),
      correlationId: ContextUtil.getCorrelationId()
    });

    try {
      // Validate query parameters before processing
      this.validateQueryParameters(query);

      const { buildings, totalCount } = await this.executeQuery(query);
      const paginationMeta = this.calculatePaginationMeta(query, totalCount);
      const buildingDtos = this.convertToDtos(buildings);

      const response: PaginatedBuildingsResponseDto = {
        data: buildingDtos,
        meta: paginationMeta,
      };

      return response;

    } catch (error) {
      this.logger.error('failed to retrieve buildings', {
        err: error,
        query: this.sanitizeQueryForLogging(query),
        correlationId: ContextUtil.getCorrelationId()
      });

      throw this.handleError(error);
    }
  }

  /**
   * Validate query parameters using custom validation logic.
   * @param query - Query parameters to validate
   * @throws ValidationException if validation fails
   */
  private validateQueryParameters(query: QueryBuildingsDto | GeospatialQueryDto): void {
    const correlationId = ContextUtil.getCorrelationId();

    // Validate pagination parameters
    const paginationValidation = ValidationErrorHandler.validatePaginationParameters(
      query.limit, 
      query.offset
    );

    if (!paginationValidation.isValid) {
      this.logger.warn('pagination validation failed', {
        errors: paginationValidation.errors,
        correlationId
      });
      
      const validationResponse = {
        statusCode: 400,
        message: 'Pagination validation failed',
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path: 'query',
        correlationId,
        details: paginationValidation.errors,
      };
      
      throw new BadRequestException(validationResponse);
    }

    // Validate WKT polygon if present
    if ('polygon' in query && query.polygon) {
      const wktValidation = ValidationErrorHandler.validateWktPolygon(query.polygon);
      
      if (!wktValidation.isValid) {
        this.logger.warn('WKT polygon validation failed', {
          errors: wktValidation.errors,
          correlationId
        });
        
        const validationResponse = {
          statusCode: 400,
          message: 'WKT polygon validation failed',
          error: 'Bad Request',
          timestamp: new Date().toISOString(),
          path: 'query.polygon',
          correlationId,
          details: wktValidation.errors,
        };
        
        throw new BadRequestException(validationResponse);
      }
    }

    // Additional validation for text filters
    this.validateTextFilters(query);
  }

  /**
   * Validate text filter parameters.
   * @param query - Query parameters to validate
   * @throws ValidationException if validation fails
   */
  private validateTextFilters(query: QueryBuildingsDto | GeospatialQueryDto): void {
    const errors: Array<{ field: string; message: string; code: string; received?: unknown }> = [];

    // Validate name filter
    if (query.name !== undefined) {
      if (typeof query.name !== 'string') {
        errors.push({
          field: 'name',
          message: 'Name must be a string',
          code: 'INVALID_TYPE',
          received: query.name,
        });
      } else if (query.name.length === 0) {
        errors.push({
          field: 'name',
          message: 'Name cannot be empty',
          code: 'TOO_SHORT',
          received: query.name,
        });
      } else if (query.name.length > 100) {
        errors.push({
          field: 'name',
          message: 'Name must be at most 100 characters',
          code: 'TOO_LONG',
          received: query.name,
        });
      }
    }

    // Validate building_type filter
    if (query.building_type !== undefined) {
      const validTypes = ['residential', 'commercial', 'industrial', 'mixed', 'other'];
      if (!validTypes.includes(query.building_type)) {
        errors.push({
          field: 'building_type',
          message: `Invalid building type. Expected: ${validTypes.join(', ')}, received: ${query.building_type}`,
          code: 'INVALID_ENUM',
          received: query.building_type,
        });
      }
    }

    // Validate address filter
    if (query.address !== undefined) {
      if (typeof query.address !== 'string') {
        errors.push({
          field: 'address',
          message: 'Address must be a string',
          code: 'INVALID_TYPE',
          received: query.address,
        });
      } else if (query.address.length === 0) {
        errors.push({
          field: 'address',
          message: 'Address cannot be empty',
          code: 'TOO_SHORT',
          received: query.address,
        });
      } else if (query.address.length > 200) {
        errors.push({
          field: 'address',
          message: 'Address must be at most 200 characters',
          code: 'TOO_LONG',
          received: query.address,
        });
      }
    }

    // Validate cadastral_code filter
    if (query.cadastral_code !== undefined) {
      if (typeof query.cadastral_code !== 'string') {
        errors.push({
          field: 'cadastral_code',
          message: 'Cadastral code must be a string',
          code: 'INVALID_TYPE',
          received: query.cadastral_code,
        });
      } else if (query.cadastral_code.length === 0) {
        errors.push({
          field: 'cadastral_code',
          message: 'Cadastral code cannot be empty',
          code: 'TOO_SHORT',
          received: query.cadastral_code,
        });
      } else if (query.cadastral_code.length > 50) {
        errors.push({
          field: 'cadastral_code',
          message: 'Cadastral code must be at most 50 characters',
          code: 'TOO_LONG',
          received: query.cadastral_code,
        });
      }
    }

    // Validate municipality_code filter
    if (query.municipality_code !== undefined) {
      if (typeof query.municipality_code !== 'string') {
        errors.push({
          field: 'municipality_code',
          message: 'Municipality code must be a string',
          code: 'INVALID_TYPE',
          received: query.municipality_code,
        });
      } else if (query.municipality_code.length === 0) {
        errors.push({
          field: 'municipality_code',
          message: 'Municipality code cannot be empty',
          code: 'TOO_SHORT',
          received: query.municipality_code,
        });
      } else if (query.municipality_code.length > 50) {
        errors.push({
          field: 'municipality_code',
          message: 'Municipality code must be at most 50 characters',
          code: 'TOO_LONG',
          received: query.municipality_code,
        });
      }
    }

    if (errors.length > 0) {
      const correlationId = ContextUtil.getCorrelationId();
      
      this.logger.warn('text filter validation failed', {
        errors,
        correlationId
      });
      
      const validationResponse = {
        statusCode: 400,
        message: 'Text filter validation failed',
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path: 'query',
        correlationId,
        details: errors,
      };
      
      throw new BadRequestException(validationResponse);
    }
  }

  /**
   * Execute the appropriate query based on whether it's geospatial or text-based.
   * @param query - Query parameters
   * @returns Promise resolving to buildings and total count
   */
  private async executeQuery(query: QueryBuildingsDto | GeospatialQueryDto): Promise<{ buildings: BuildingData[]; totalCount: number }> {
    if ('polygon' in query && query.polygon) {
      this.logger.debug('executing geospatial query', {
        hasPolygon: true,
        correlationId: ContextUtil.getCorrelationId()
      });

      const geospatialQuery = query as GeospatialQueryDto;
      const [buildings, totalCount] = await Promise.all([
        this.buildingsService.findByPolygon(geospatialQuery),
        this.buildingsService.countTotalByPolygon(geospatialQuery)
      ]);

      return { buildings, totalCount };
    } else {
      this.logger.debug('executing text-based query', {
        hasPolygon: false,
        correlationId: ContextUtil.getCorrelationId()
      });

      const textQuery = query as QueryBuildingsDto;
      const [buildings, totalCount] = await Promise.all([
        this.buildingsService.findAll(textQuery),
        this.buildingsService.countTotal(textQuery)
      ]);

      return { buildings, totalCount };
    }
  }

  /**
   * Calculate pagination metadata from query parameters and total count.
   * @param query - Query parameters
   * @param totalCount - Total number of matching records
   * @returns Pagination metadata
   */
  private calculatePaginationMeta(query: QueryBuildingsDto | GeospatialQueryDto, totalCount: number): PaginationMeta {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    return {
      total: totalCount,
      limit,
      offset,
      hasNext: offset + limit < totalCount,
      hasPrevious: offset > 0,
    };
  }

  /**
   * Convert BuildingData array to BuildingResponseDto array.
   * @param buildings - Array of building data from service
   * @returns Array of building response DTOs
   */
  private convertToDtos(buildings: BuildingData[]): BuildingResponseDto[] {
    return buildings.map(building => ({
      id: building.id,
      cadastral_code: building.cadastral_code,
      municipality_code: building.municipality_code,
      name: building.name,
      building_type: building.building_type,
      address: building.address,
      geom: building.geom,
      basic_data: building.basic_data,
      visible: building.visible,
      created_at: building.created_at.toISOString(),
      updated_at: building.updated_at?.toISOString() ?? null,
      updated_by: building.updated_by,
    }));
  }

  /**
   * Handle and transform errors into appropriate HTTP exceptions.
   * @param error - The error to handle
   * @returns HTTP exception to throw
   */
  private handleError(error: unknown): HttpException {
    const correlationId = ContextUtil.getCorrelationId();

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      this.logger.warn('validation error occurred', {
        zodError: error.issues,
        correlationId
      });
      return ValidationErrorHandler.createBadRequestException(error, 'query');
    }

    // Handle validation exceptions
    if (error instanceof ValidationException) {
      this.logger.warn('validation exception occurred', {
        message: error.message,
        correlationId
      });
      return error;
    }

    // Handle database exceptions
    if (error instanceof DatabaseException) {
      this.logger.error('database exception occurred', {
        message: error.message,
        correlationId
      });
      return error;
    }

    // Handle PostGIS/WKT specific errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('invalid wkt') || errorMessage.includes('wkt')) {
        this.logger.warn('WKT validation error', {
          message: error.message,
          correlationId
        });
        return new ValidationException(
          'Invalid WKT polygon format. Please provide a valid WKT POLYGON string.',
          'query.polygon'
        );
      }

      if (errorMessage.includes('st_geomfromtext') || errorMessage.includes('geometry')) {
        this.logger.warn('PostGIS geometry error', {
          message: error.message,
          correlationId
        });
        return new ValidationException(
          'Invalid geometry format. Please check your polygon coordinates.',
          'query.polygon'
        );
      }

      if (errorMessage.includes('database') || errorMessage.includes('connection')) {
        this.logger.error('database connection error', {
          message: error.message,
          correlationId
        });
        return new DatabaseException(
          'Database connection failed. Please try again later.',
          'database.connection'
        );
      }

      if (errorMessage.includes('timeout')) {
        this.logger.error('database timeout error', {
          message: error.message,
          correlationId
        });
        return new DatabaseException(
          'Database query timeout. Please try a simpler query or try again later.',
          'database.timeout'
        );
      }

      // Generic validation error for other known validation issues
      if (errorMessage.includes('validation')) {
        this.logger.warn('generic validation error', {
          message: error.message,
          correlationId
        });
        return new ValidationException(error.message, 'query');
      }
    }

    // Log unexpected errors with full context
    this.logger.error('unexpected error occurred', {
      err: error,
      errorType: error?.constructor?.name,
      correlationId
    });

    return new HttpException(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
        error: 'Internal Server Error',
        correlationId,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  /**
   * Sanitize query parameters for logging (remove sensitive data like large polygons).
   * @param query - Query parameters to sanitize
   * @returns Sanitized query object for logging
   */
  private sanitizeQueryForLogging(query: QueryBuildingsDto | GeospatialQueryDto): Record<string, unknown> {
    const sanitized = { ...query };
    
    // Replace polygon with placeholder for logging to avoid large WKT strings in logs
    if ('polygon' in sanitized && sanitized.polygon) {
      sanitized.polygon = '[WKT_POLYGON]';
    }
    
    return sanitized;
  }
}
