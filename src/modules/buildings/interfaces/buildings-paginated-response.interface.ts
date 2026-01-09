import { BuildingData } from './building-data.interface';
import { PaginationMeta } from './pagination-meta.interface';

/**
 * Interface for paginated building response used in the service layer.
 * Contains the building data array and pagination metadata.
 */
export interface BuildingsPaginatedResponse {
  /**
   * Array of building data objects
   */
  data: BuildingData[];

  /**
   * Pagination metadata
   */
  meta: PaginationMeta;
}