import { Controller } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { ROUTES } from '../../config/routes.config';

import { BuildingsService } from './buildings.service';

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

  // Placeholder for buildings endpoints
}
