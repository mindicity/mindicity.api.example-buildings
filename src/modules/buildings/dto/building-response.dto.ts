import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Zod schema for GeoJSON Point geometry.
 */
const GeoJSONPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]), // [longitude, latitude]
});

/**
 * Zod schema for building response data.
 * Defines the structure of building data returned by API endpoints.
 */
const BuildingResponseSchema = z.object({
  id: z.string(),
  cadastral_code: z.string(),
  municipality_code: z.string(),
  name: z.string().nullable(),
  building_type: z.string(),
  address: z.string(),
  geom: GeoJSONPointSchema.nullable(),
  basic_data: z.record(z.string(), z.unknown()), // JSONB field as key-value pairs
  visible: z.boolean(),
  created_at: z.string().datetime(), // Use string datetime instead of Date for Swagger compatibility
  updated_at: z.string().datetime().nullable(),
  updated_by: z.string().nullable(),
});

/**
 * DTO for building response data with comprehensive validation.
 * Used by controllers for response serialization and type safety.
 */
export class BuildingResponseDto extends createZodDto(BuildingResponseSchema) {}

export { BuildingResponseSchema, GeoJSONPointSchema };