/**
 * Interface for paginated building query parameters used in the service layer.
 * Extends the basic query interface with pagination parameters.
 */
export interface BuildingsPaginatedQuery {
  // Existing filter parameters
  cadastral_code?: string;
  municipality_code?: string;
  name?: string;
  building_type?: string;
  address?: string;
  polygon?: string;
  
  // Pagination parameters
  limit: number;
  offset: number;
}