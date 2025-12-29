import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Zod schema for building query parameters with text filtering validation.
 * Supports filtering by name, building type, address, cadastral code, and municipality code.
 */
const QueryBuildingsSchema = z.object({
  // Text filters with length validation
  name: z.string().min(1).max(100).optional(),
  building_type: z.enum(['residential', 'commercial', 'industrial', 'mixed', 'other']).optional(),
  address: z.string().min(1).max(200).optional(),
  cadastral_code: z.string().min(1).max(50).optional(),
  municipality_code: z.string().min(1).max(50).optional(),
  
  // Pagination parameters
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * DTO for building query parameters with comprehensive validation.
 * Used by controllers for request validation and type safety.
 */
export class QueryBuildingsDto extends createZodDto(QueryBuildingsSchema) {}

export { QueryBuildingsSchema };