import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const QueryBuildingsPaginatedSchema = z.object({
  // Existing filter parameters
  cadastral_code: z.string().optional().describe('Cadastral code for exact matching'),
  municipality_code: z.string().optional().describe('Municipality code for exact matching'),
  name: z.string().optional().describe('Building name for case-insensitive partial matching'),
  building_type: z.string().optional().describe('Building type for exact matching'),
  address: z.string().optional().describe('Address for case-insensitive partial matching'),
  polygon: z.string().optional().describe('WKT polygon for spatial filtering in EPSG:4326'),
  
  // New pagination parameters - coerce strings to numbers for query parameters
  limit: z.coerce.number().int().min(1).max(100).default(20).describe('Maximum number of records to return (default: 20, max: 100)'),
  offset: z.coerce.number().int().min(0).default(0).describe('Number of records to skip (default: 0)'),
});

/**
 * Query DTO for paginated building search with text and spatial filtering.
 * Supports all existing filters plus pagination parameters (limit and offset).
 */
export class QueryBuildingsPaginatedDto extends createZodDto(QueryBuildingsPaginatedSchema) {}