import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { ROUTES } from '../../config/routes.config';

import { BuildingsService } from './buildings.service';
import { QueryBuildingsDto, BuildingResponseDto } from './dto';

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
   * Retrieves buildings based on query filters.
   * Supports text filtering and spatial polygon filtering.
   * @param query - Query parameters for filtering buildings
   * @returns Promise resolving to array of building response DTOs
   */
  @Get('list')
  @ApiOperation({ summary: 'Get buildings with optional filtering' })
  @ApiResponse({
    status: 200,
    description: 'List of buildings matching the filter criteria',
    type: [BuildingResponseDto],
  })
  async findAll(@Query() query: QueryBuildingsDto): Promise<BuildingResponseDto[]> {
    this.logger.trace('findAll()', { query });

    // Convert DTO to interface for service
    const buildings = await this.buildingsService.findAll(query);

    // Convert back to DTO for response
    return buildings.map(building => ({
      id: building.id,
      cadastral_code: building.cadastral_code,
      municipality_code: building.municipality_code,
      name: building.name,
      building_type: building.building_type,
      address: building.address,
      geometry: building.geometry,
      basic_data: building.basic_data,
      visible: building.visible,
      created_at: building.created_at.toISOString(),
      updated_at: building.updated_at?.toISOString(),
      updated_by: building.updated_by,
    }));
  }
}
