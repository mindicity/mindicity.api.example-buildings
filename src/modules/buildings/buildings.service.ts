import { Injectable } from '@nestjs/common';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { DatabaseService } from '../../infrastructure/database/database.service';

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

  // Placeholder for buildings service methods
}
