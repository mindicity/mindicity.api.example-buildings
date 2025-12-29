import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Zod schema for pagination metadata.
 * Provides information about pagination state and navigation.
 */
const PaginationMetaSchema = z.object({
  total: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
});

/**
 * DTO for pagination metadata with validation.
 * Used by controllers for paginated response metadata.
 */
export class PaginationMetaDto extends createZodDto(PaginationMetaSchema) {}

export { PaginationMetaSchema };