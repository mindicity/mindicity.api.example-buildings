import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { BuildingResponseDto } from './building-response.dto';

const PaginationMetaSchema = z.object({
  total: z.number().int().min(0).describe('Total number of records matching the filter criteria'),
  limit: z.number().int().min(1).max(100).describe('Maximum number of records returned in this page'),
  offset: z.number().int().min(0).describe('Number of records skipped from the beginning'),
  hasNext: z.boolean().describe('Whether more records exist beyond the current page'),
  hasPrevious: z.boolean().describe('Whether records exist before the current page'),
});

const BuildingsPaginatedResponseSchema = z.object({
  data: z.array(z.any()).describe('Array of building objects matching the filter criteria'),
  meta: PaginationMetaSchema.describe('Pagination metadata with navigation information'),
});

/**
 * Response DTO for paginated building data.
 * Contains an array of building objects and pagination metadata.
 */
export class BuildingsPaginatedResponseDto extends createZodDto(BuildingsPaginatedResponseSchema) {
  /**
   * Array of building response objects
   */
  data!: BuildingResponseDto[];

  /**
   * Pagination metadata
   */
  meta!: {
    total: number;
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}