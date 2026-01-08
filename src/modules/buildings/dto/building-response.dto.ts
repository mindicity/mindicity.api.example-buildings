import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const BuildingResponseSchema = z.object({
  id: z.string().describe('Unique building identifier'),
  cadastral_code: z.string().describe('Cadastral code for land parcel identification'),
  municipality_code: z.string().describe('Administrative municipality code'),
  name: z.string().optional().describe('Building name if available'),
  building_type: z.string().describe('Classification category for building usage or structure type'),
  address: z.string().describe('Building address'),
  geometry: z.object({}).optional().describe('Building geometry in GeoJSON format'),
  basic_data: z.object({}).describe('Additional building data in JSON format'),
  visible: z.boolean().describe('Visibility flag - only visible buildings are returned by default'),
  created_at: z.string().describe('Building record creation timestamp in ISO format'),
  updated_at: z.string().optional().describe('Building record last update timestamp in ISO format'),
  updated_by: z.string().optional().describe('User who last updated the building record'),
});

/**
 * Response DTO for building data with all available fields.
 * Contains building identification, location, geometry, and metadata.
 */
export class BuildingResponseDto extends createZodDto(BuildingResponseSchema) {}