import { Module } from '@nestjs/common';

import { ContextLoggerService } from '../../common/services/context-logger.service';
import { DatabaseModule } from '../../infrastructure/database/database.module';

import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';

/**
 * BuildingsModule provides building data retrieval functionality with context-aware logging.
 * Imports DatabaseModule for raw PostgreSQL query capabilities.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [BuildingsController],
  providers: [BuildingsService, ContextLoggerService],
  exports: [BuildingsService],
})
export class BuildingsModule {}
