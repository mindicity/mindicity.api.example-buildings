import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { BuildingResponseSchema } from './building-response.dto';
import { PaginationMetaSchema } from './pagination-meta.dto';

/**
 * Zod schema for paginated buildings response.
 * Combines building data array with pagination metadata.
 */
const PaginatedBuildingsResponseSchema = z.object({
  data: z.array(BuildingResponseSchema),
  meta: PaginationMetaSchema,
});

/**
 * DTO for paginated buildings response with validation.
 * Used by controllers for paginated API responses.
 */
export class PaginatedBuildingsResponseDto extends createZodDto(PaginatedBuildingsResponseSchema) {}

export { PaginatedBuildingsResponseSchema };