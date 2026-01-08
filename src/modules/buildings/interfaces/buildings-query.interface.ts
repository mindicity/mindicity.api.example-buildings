/**
 * Interface for building query parameters used in the service layer.
 * Represents the internal query structure without validation constraints.
 */
export interface BuildingsQuery {
  cadastral_code?: string;
  municipality_code?: string;
  name?: string;
  building_type?: string;
  address?: string;
  polygon?: string;
}