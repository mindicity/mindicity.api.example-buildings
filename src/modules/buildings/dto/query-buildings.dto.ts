import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const QueryBuildingsSchema = z.object({
  cadastral_code: z.string().optional().describe('Cadastral code for exact matching'),
  municipality_code: z.string().optional().describe('Municipality code for exact matching'),
  name: z.string().optional().describe('Building name for case-insensitive partial matching'),
  building_type: z.string().optional().describe('Building type for exact matching'),
  address: z.string().optional().describe('Address for case-insensitive partial matching'),
  polygon: z.string().optional().describe('WKT polygon for spatial filtering in EPSG:4326'),
});

/**
 * Query DTO for building search with text and spatial filtering.
 * Supports filtering by cadastral code, municipality, name, type, address, and spatial polygon.
 */
export class QueryBuildingsDto extends createZodDto(QueryBuildingsSchema) {}