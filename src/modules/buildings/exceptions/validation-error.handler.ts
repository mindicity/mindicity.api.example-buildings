import { BadRequestException } from '@nestjs/common';
import { ZodError, ZodIssue } from 'zod';

import { ContextUtil } from '../../../common/utils/context.util';

/**
 * Interface for formatted validation error details.
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  received?: unknown;
}

/**
 * Interface for comprehensive validation error response.
 */
export interface ValidationErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  correlationId: string;
  details: ValidationErrorDetail[];
}

/**
 * Utility class for handling and formatting Zod validation errors.
 * Provides descriptive error messages for API consumers.
 */
export class ValidationErrorHandler {
  /**
   * Formats a ZodError into a structured validation error response.
   * @param error - The ZodError to format
   * @param path - The request path where the error occurred
   * @returns Formatted validation error response
   */
  static formatZodError(error: ZodError, path: string = ''): ValidationErrorResponse {
    const details = error.issues.map(issue => this.formatZodIssue(issue));
    
    return {
      statusCode: 400,
      message: 'Validation failed',
      error: 'Bad Request',
      timestamp: new Date().toISOString(),
      path,
      correlationId: ContextUtil.getCorrelationId(),
      details,
    };
  }

  /**
   * Formats a single ZodIssue into a validation error detail.
   * @param issue - The ZodIssue to format
   * @returns Formatted validation error detail
   */
  private static formatZodIssue(issue: ZodIssue): ValidationErrorDetail {
    const field = issue.path.length > 0 ? issue.path.join('.') : 'root';
    
    switch (issue.code) {
      case 'invalid_type':
        return {
          field,
          message: `Expected ${(issue as any).expected}, received ${(issue as any).received}`,
          code: 'INVALID_TYPE',
          received: (issue as any).received,
        };
        
      case 'too_small':
        if ((issue as any).type === 'string') {
          return {
            field,
            message: `String must contain at least ${(issue as any).minimum} character(s)`,
            code: 'TOO_SHORT',
            received: (issue as any).received,
          };
        } else if ((issue as any).type === 'number') {
          return {
            field,
            message: `Number must be greater than or equal to ${(issue as any).minimum}`,
            code: 'TOO_SMALL',
            received: (issue as any).received,
          };
        }
        return {
          field,
          message: `Value must be at least ${(issue as any).minimum}`,
          code: 'TOO_SMALL',
          received: (issue as any).received,
        };
        
      case 'too_big':
        if ((issue as any).type === 'string') {
          return {
            field,
            message: `String must contain at most ${(issue as any).maximum} character(s)`,
            code: 'TOO_LONG',
            received: (issue as any).received,
          };
        } else if ((issue as any).type === 'number') {
          return {
            field,
            message: `Number must be less than or equal to ${(issue as any).maximum}`,
            code: 'TOO_BIG',
            received: (issue as any).received,
          };
        }
        return {
          field,
          message: `Value must be at most ${(issue as any).maximum}`,
          code: 'TOO_BIG',
          received: (issue as any).received,
        };
        
      case 'invalid_union':
        return {
          field,
          message: `Invalid enum value. Expected one of the allowed values, received: ${(issue as any).received}`,
          code: 'INVALID_ENUM',
          received: (issue as any).received,
        };
        
      case 'custom':
        // Handle custom validation errors (like WKT polygon validation)
        if (issue.message.includes('WKT polygon')) {
          return {
            field,
            message: issue.message,
            code: 'INVALID_WKT_POLYGON',
            received: (issue as any).received,
          };
        }
        return {
          field,
          message: issue.message,
          code: 'CUSTOM_VALIDATION',
          received: (issue as any).received,
        };
        
      case 'invalid_format':
        return {
          field,
          message: 'String does not match required pattern',
          code: 'INVALID_FORMAT',
          received: (issue as any).received,
        };
        
      default:
        return {
          field,
          message: issue.message,
          code: issue.code.toUpperCase(),
          received: (issue as any).received,
        };
    }
  }

  /**
   * Creates a BadRequestException with formatted Zod validation errors.
   * @param error - The ZodError to convert
   * @param path - The request path where the error occurred
   * @returns BadRequestException with structured error details
   */
  static createBadRequestException(error: ZodError, path: string = ''): BadRequestException {
    const formattedError = this.formatZodError(error, path);
    return new BadRequestException(formattedError);
  }

  /**
   * Validates pagination parameters and provides descriptive error messages.
   * @param limit - The limit parameter to validate
   * @param offset - The offset parameter to validate
   * @returns Validation result with formatted errors if any
   */
  static validatePaginationParameters(
    limit?: number, 
    offset?: number
  ): { isValid: boolean; errors: ValidationErrorDetail[] } {
    const errors: ValidationErrorDetail[] = [];

    if (limit !== undefined) {
      if (!Number.isInteger(limit)) {
        errors.push({
          field: 'limit',
          message: 'Limit must be an integer',
          code: 'INVALID_TYPE',
          received: limit,
        });
      } else if (limit < 1) {
        errors.push({
          field: 'limit',
          message: 'Limit must be greater than or equal to 1',
          code: 'TOO_SMALL',
          received: limit,
        });
      } else if (limit > 100) {
        errors.push({
          field: 'limit',
          message: 'Limit must be less than or equal to 100',
          code: 'TOO_BIG',
          received: limit,
        });
      }
    }

    if (offset !== undefined) {
      if (!Number.isInteger(offset)) {
        errors.push({
          field: 'offset',
          message: 'Offset must be an integer',
          code: 'INVALID_TYPE',
          received: offset,
        });
      } else if (offset < 0) {
        errors.push({
          field: 'offset',
          message: 'Offset must be greater than or equal to 0',
          code: 'TOO_SMALL',
          received: offset,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates WKT polygon format and provides descriptive error messages.
   * @param polygon - The WKT polygon string to validate
   * @returns Validation result with formatted errors if any
   */
  static validateWktPolygon(polygon: string): { isValid: boolean; errors: ValidationErrorDetail[] } {
    const errors: ValidationErrorDetail[] = [];

    if (!polygon || polygon.trim().length === 0) {
      errors.push({
        field: 'polygon',
        message: 'Polygon parameter is required and cannot be empty',
        code: 'REQUIRED',
        received: polygon,
      });
      return { isValid: false, errors };
    }

    const trimmed = polygon.trim();

    // Basic WKT POLYGON format validation
    const WKT_POLYGON_REGEX = /^POLYGON\s*\(\s*\([^)]+\)\s*\)$/i;
    if (!WKT_POLYGON_REGEX.test(trimmed)) {
      errors.push({
        field: 'polygon',
        message: 'Invalid WKT polygon format. Expected: POLYGON((x1 y1, x2 y2, x3 y3, x1 y1))',
        code: 'INVALID_WKT_FORMAT',
        received: polygon,
      });
      return { isValid: false, errors };
    }

    // Extract coordinates and validate structure
    const coordsMatch = trimmed.match(/POLYGON\s*\(\s*\(([^)]+)\)\s*\)/i);
    if (!coordsMatch) {
      errors.push({
        field: 'polygon',
        message: 'Unable to parse polygon coordinates',
        code: 'INVALID_WKT_COORDINATES',
        received: polygon,
      });
      return { isValid: false, errors };
    }

    const coordsStr = coordsMatch[1];
    const coordPairs = coordsStr.split(',').map(pair => pair.trim());

    if (coordPairs.length < 4) {
      errors.push({
        field: 'polygon',
        message: 'Polygon must have at least 4 coordinate pairs (minimum 3 vertices + closing point)',
        code: 'INSUFFICIENT_COORDINATES',
        received: polygon,
      });
      return { isValid: false, errors };
    }

    // Validate each coordinate pair
    for (let i = 0; i < coordPairs.length; i++) {
      const coordPair = coordPairs[i].trim();
      const coords = coordPair.split(/\s+/);
      
      if (coords.length !== 2) {
        errors.push({
          field: 'polygon',
          message: `Coordinate pair ${i + 1} must have exactly 2 values (x y). Found: ${coords.length}`,
          code: 'INVALID_COORDINATE_PAIR',
          received: coordPair,
        });
        continue;
      }

      // Check if coordinates are valid numbers
      for (let j = 0; j < coords.length; j++) {
        const coord = coords[j];
        const num = parseFloat(coord);
        if (isNaN(num) || !isFinite(num)) {
          errors.push({
            field: 'polygon',
            message: `Invalid coordinate value at pair ${i + 1}, position ${j + 1}: ${coord}`,
            code: 'INVALID_COORDINATE_VALUE',
            received: coord,
          });
        }
      }
    }

    // Check if polygon is closed (first and last coordinates match)
    if (errors.length === 0) {
      const firstCoord = coordPairs[0].trim();
      const lastCoord = coordPairs[coordPairs.length - 1].trim();
      
      if (firstCoord !== lastCoord) {
        errors.push({
          field: 'polygon',
          message: 'Polygon must be closed (first and last coordinate pairs must be identical)',
          code: 'UNCLOSED_POLYGON',
          received: `First: ${firstCoord}, Last: ${lastCoord}`,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}