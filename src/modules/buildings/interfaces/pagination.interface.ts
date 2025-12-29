/**
 * Internal interface for pagination options.
 * Used by services for query building and result limiting.
 */
export interface PaginationOptions {
  limit: number;
  offset: number;
}

/**
 * Internal interface for pagination metadata.
 * Used by services to provide pagination information in responses.
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
  hasPrevious: boolean;
}