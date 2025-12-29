import { HttpStatus } from '@nestjs/common';

import { ContextUtil } from '../../../common/utils/context.util';
import { DatabaseException } from '../../../common/exceptions/database.exception';
import { ValidationException } from '../../../common/exceptions/validation.exception';

/**
 * Interface for database error details.
 */
export interface DatabaseErrorDetail {
  code: string;
  message: string;
  severity?: string;
  detail?: string;
  hint?: string;
  position?: string;
  where?: string;
}

/**
 * Interface for comprehensive database error response.
 */
export interface DatabaseErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  correlationId: string;
  errorCode: string;
  type: string;
  details?: DatabaseErrorDetail;
}

/**
 * Utility class for handling and formatting database errors.
 * Provides specific error handling for PostgreSQL and PostGIS errors.
 */
export class DatabaseErrorHandler {
  /**
   * Handles database errors and converts them to appropriate exceptions.
   * @param error - The database error to handle
   * @param context - Additional context about where the error occurred
   * @returns Appropriate exception based on error type
   */
  static handleDatabaseError(error: unknown, context: string = ''): Error {
    const correlationId = ContextUtil.getCorrelationId();

    // Handle PostgreSQL errors (pg library errors)
    if (this.isPostgreSQLError(error)) {
      return this.handlePostgreSQLError(error, context, correlationId);
    }

    // Handle PostGIS specific errors
    if (this.isPostGISError(error)) {
      return this.handlePostGISError(error, context, correlationId);
    }

    // Handle connection errors
    if (this.isConnectionError(error)) {
      return this.handleConnectionError(error, context, correlationId);
    }

    // Handle timeout errors
    if (this.isTimeoutError(error)) {
      return this.handleTimeoutError(error, context, correlationId);
    }

    // Handle generic database errors
    if (this.isDatabaseError(error)) {
      return this.handleGenericDatabaseError(error, context, correlationId);
    }

    // If not a database error, return as-is
    return error instanceof Error ? error : new Error('Unknown error occurred');
  }

  /**
   * Checks if the error is a PostgreSQL database error.
   * @param error - The error to check
   * @returns True if it's a PostgreSQL error
   */
  private static isPostgreSQLError(error: unknown): error is PostgreSQLError {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      'severity' in error &&
      typeof (error as any).code === 'string'
    );
  }

  /**
   * Checks if the error is a PostGIS specific error.
   * @param error - The error to check
   * @returns True if it's a PostGIS error
   */
  private static isPostGISError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const message = error.message.toLowerCase();
    return (
      message.includes('st_') ||
      message.includes('postgis') ||
      message.includes('geometry') ||
      message.includes('wkt') ||
      message.includes('srid') ||
      message.includes('spatial')
    );
  }

  /**
   * Checks if the error is a connection error.
   * @param error - The error to check
   * @returns True if it's a connection error
   */
  private static isConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const message = error.message.toLowerCase();
    return (
      message.includes('connection') ||
      message.includes('connect') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('etimedout') ||
      message.includes('network')
    );
  }

  /**
   * Checks if the error is a timeout error.
   * @param error - The error to check
   * @returns True if it's a timeout error
   */
  private static isTimeoutError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('query timeout') ||
      message.includes('statement timeout')
    );
  }

  /**
   * Checks if the error is a generic database error.
   * @param error - The error to check
   * @returns True if it's a database error
   */
  private static isDatabaseError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const message = error.message.toLowerCase();
    return (
      message.includes('database') ||
      message.includes('sql') ||
      message.includes('query') ||
      message.includes('relation') ||
      message.includes('column') ||
      message.includes('table')
    );
  }

  /**
   * Handles PostgreSQL specific errors.
   * @param error - The PostgreSQL error
   * @param context - Error context
   * @param correlationId - Correlation ID for logging
   * @returns Appropriate exception
   */
  private static handlePostgreSQLError(
    error: PostgreSQLError, 
    context: string, 
    correlationId: string
  ): Error {
    const errorDetail: DatabaseErrorDetail = {
      code: error.code,
      message: error.message,
      severity: error.severity,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      where: error.where,
    };

    switch (error.code) {
      case '42P01': // undefined_table
        return new DatabaseException(
          'Database table not found. Please contact system administrator.',
          `${context}.table_not_found`
        );

      case '42703': // undefined_column
        return new DatabaseException(
          'Database column not found. Please contact system administrator.',
          `${context}.column_not_found`
        );

      case '23505': // unique_violation
        return new ValidationException(
          'Duplicate entry found. The provided data already exists.',
          `${context}.duplicate_entry`
        );

      case '23503': // foreign_key_violation
        return new ValidationException(
          'Referenced record not found. Please check your input data.',
          `${context}.foreign_key_violation`
        );

      case '23502': // not_null_violation
        return new ValidationException(
          'Required field is missing. Please provide all required data.',
          `${context}.not_null_violation`
        );

      case '22P02': // invalid_text_representation
        return new ValidationException(
          'Invalid data format. Please check your input values.',
          `${context}.invalid_format`
        );

      case '22003': // numeric_value_out_of_range
        return new ValidationException(
          'Numeric value is out of range. Please provide a valid number.',
          `${context}.numeric_out_of_range`
        );

      case '08006': // connection_failure
      case '08001': // sqlclient_unable_to_establish_sqlconnection
        return new DatabaseException(
          'Database connection failed. Please try again later.',
          `${context}.connection_failure`
        );

      case '57014': // query_canceled
        return new DatabaseException(
          'Database query was canceled. Please try a simpler query.',
          `${context}.query_canceled`
        );

      default:
        return new DatabaseException(
          `Database error occurred: ${error.message}`,
          `${context}.postgresql_error.${error.code}`
        );
    }
  }

  /**
   * Handles PostGIS specific errors.
   * @param error - The PostGIS error
   * @param context - Error context
   * @param correlationId - Correlation ID for logging
   * @returns Appropriate exception
   */
  private static handlePostGISError(
    error: unknown, 
    context: string, 
    correlationId: string
  ): Error {
    // Ensure error is an Error instance
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    const message = errorInstance.message.toLowerCase();

    if (message.includes('invalid wkt') || message.includes('wkt')) {
      return new ValidationException(
        'Invalid WKT polygon format. Please provide a valid WKT POLYGON string with proper coordinate pairs.',
        `${context}.invalid_wkt`
      );
    }

    if (message.includes('st_geomfromtext')) {
      return new ValidationException(
        'Invalid geometry format. Please check your polygon coordinates and ensure they form a valid geometry.',
        `${context}.invalid_geometry`
      );
    }

    if (message.includes('srid')) {
      return new ValidationException(
        'Invalid spatial reference system. Please ensure your coordinates use the correct SRID (4326 for WGS84).',
        `${context}.invalid_srid`
      );
    }

    if (message.includes('self-intersection') || message.includes('invalid geometry')) {
      return new ValidationException(
        'Invalid polygon geometry. Please ensure your polygon does not self-intersect and has valid coordinates.',
        `${context}.invalid_polygon_geometry`
      );
    }

    if (message.includes('coordinate dimension')) {
      return new ValidationException(
        'Invalid coordinate dimensions. Please provide 2D coordinates (x y) for each point.',
        `${context}.invalid_coordinate_dimension`
      );
    }

    return new DatabaseException(
      `PostGIS spatial operation failed: ${errorInstance.message}`,
      `${context}.postgis_error`
    );
  }

  /**
   * Handles connection errors.
   * @param error - The connection error
   * @param context - Error context
   * @param correlationId - Correlation ID for logging
   * @returns Appropriate exception
   */
  private static handleConnectionError(
    error: unknown, 
    context: string, 
    correlationId: string
  ): Error {
    // Ensure error is an Error instance
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    const message = errorInstance.message.toLowerCase();

    if (message.includes('econnrefused')) {
      return new DatabaseException(
        'Database server is not available. Please try again later.',
        `${context}.connection_refused`
      );
    }

    if (message.includes('enotfound')) {
      return new DatabaseException(
        'Database server not found. Please contact system administrator.',
        `${context}.server_not_found`
      );
    }

    if (message.includes('etimedout')) {
      return new DatabaseException(
        'Database connection timed out. Please try again later.',
        `${context}.connection_timeout`
      );
    }

    return new DatabaseException(
      'Database connection failed. Please try again later.',
      `${context}.connection_error`
    );
  }

  /**
   * Handles timeout errors.
   * @param error - The timeout error
   * @param context - Error context
   * @param correlationId - Correlation ID for logging
   * @returns Appropriate exception
   */
  private static handleTimeoutError(
    error: unknown, 
    context: string, 
    correlationId: string
  ): Error {
    // Ensure error is an Error instance
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    
    return new DatabaseException(
      'Database query timed out. Please try a simpler query or try again later.',
      `${context}.query_timeout`
    );
  }

  /**
   * Handles generic database errors.
   * @param error - The database error
   * @param context - Error context
   * @param correlationId - Correlation ID for logging
   * @returns Appropriate exception
   */
  private static handleGenericDatabaseError(
    error: unknown, 
    context: string, 
    correlationId: string
  ): Error {
    // Ensure error is an Error instance
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    
    return new DatabaseException(
      `Database operation failed: ${errorInstance.message}`,
      `${context}.database_error`
    );
  }

  /**
   * Creates a formatted error response for database errors.
   * @param error - The database error
   * @param correlationId - Correlation ID for tracking
   * @returns Formatted error response
   */
  static formatDatabaseErrorResponse(
    error: DatabaseException, 
    correlationId: string
  ): DatabaseErrorResponse {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: error.message,
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      correlationId,
      errorCode: 'db-00002',
      type: 'DatabaseError',
    };
  }
}

/**
 * Interface for PostgreSQL error objects.
 */
interface PostgreSQLError {
  code: string;
  severity: string;
  message: string;
  detail?: string;
  hint?: string;
  position?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
}