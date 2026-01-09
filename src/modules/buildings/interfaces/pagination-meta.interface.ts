/**
 * Interface for pagination metadata used in the service layer.
 * Contains information about the current page and navigation availability.
 */
export interface PaginationMeta {
  /**
   * Total number of records matching the filter criteria
   */
  total: number;

  /**
   * Maximum number of records returned in this page
   */
  limit: number;

  /**
   * Number of records skipped from the beginning
   */
  offset: number;

  /**
   * Whether more records exist beyond the current page
   */
  hasNext: boolean;

  /**
   * Whether records exist before the current page
   */
  hasPrevious: boolean;
}