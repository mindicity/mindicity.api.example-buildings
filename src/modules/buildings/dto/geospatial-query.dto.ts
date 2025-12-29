import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * WKT polygon validation regex.
 * Validates basic WKT POLYGON format: POLYGON((x1 y1, x2 y2, ..., x1 y1))
 * Uses a simplified pattern to avoid ReDoS vulnerabilities.
 */
const WKT_POLYGON_REGEX = /^POLYGON\s*\(\s*\([^)]+\)\s*\)$/i;

/**
 * Custom Zod validator for WKT polygon format.
 */
const wktPolygonValidator = z.string().refine(
  (value) => {
    if (!value || value.trim().length === 0) {
      return false;
    }
    
    const trimmed = value.trim();
    
    // Basic WKT POLYGON format validation
    if (!WKT_POLYGON_REGEX.test(trimmed)) {
      return false;
    }
    
    // Additional validation: ensure polygon is closed (first and last coordinates match)
    const coordsMatch = trimmed.match(/POLYGON\s*\(\s*\(([^)]+)\)\s*\)/i);
    if (!coordsMatch) {
      return false;
    }
    
    const coordsStr = coordsMatch[1];
    const coordPairs = coordsStr.split(',').map(pair => pair.trim());
    
    if (coordPairs.length < 4) {
      return false; // Minimum 4 points for a closed polygon
    }
    
    // Validate each coordinate pair is 2D (x y format)
    for (const coordPair of coordPairs) {
      const coords = coordPair.trim().split(/\s+/);
      if (coords.length !== 2) {
        return false; // Must be exactly 2 coordinates (x y)
      }
      
      // Check if coordinates are valid numbers
      if (!coords.every(coord => !isNaN(parseFloat(coord)) && isFinite(parseFloat(coord)))) {
        return false;
      }
    }
    
    // Check if first and last coordinates are the same (closed polygon)
    const firstCoord = coordPairs[0].trim();
    const lastCoord = coordPairs[coordPairs.length - 1].trim();
    
    return firstCoord === lastCoord;
  },
  {
    message: 'Invalid WKT polygon format. Expected: POLYGON((x1 y1, x2 y2, x3 y3, x1 y1)) with minimum 4 coordinate pairs and closed geometry.',
  }
);

/**
 * Zod schema for geospatial query parameters with WKT polygon validation.
 * Extends basic query parameters with spatial filtering capability.
 */
const GeospatialQuerySchema = z.object({
  // Text filters (inherited from QueryBuildingsDto)
  name: z.string().min(1).max(100).optional(),
  building_type: z.enum(['residential', 'commercial', 'industrial', 'mixed', 'other']).optional(),
  address: z.string().min(1).max(200).optional(),
  cadastral_code: z.string().min(1).max(50).optional(),
  municipality_code: z.string().min(1).max(50).optional(),
  
  // Pagination parameters
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  
  // Geospatial filter with WKT validation
  polygon: wktPolygonValidator,
});

/**
 * DTO for geospatial query parameters with WKT polygon validation.
 * Used by controllers for spatial query validation and type safety.
 */
export class GeospatialQueryDto extends createZodDto(GeospatialQuerySchema) {}

export { GeospatialQuerySchema, wktPolygonValidator };