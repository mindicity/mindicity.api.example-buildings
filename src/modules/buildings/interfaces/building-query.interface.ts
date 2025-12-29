/**
 * Internal interface for building query parameters.
 * Used by services for filtering and pagination operations.
 */
export interface BuildingQuery {
  name?: string;
  building_type?: string;
  address?: string;
  cadastral_code?: string;
  municipality_code?: string;
  limit?: number;
  offset?: number;
}

/**
 * Internal interface for geospatial query parameters.
 * Extends BuildingQuery with polygon filtering capability.
 */
export interface GeospatialQuery extends BuildingQuery {
  polygon: string; // WKT format polygon
}