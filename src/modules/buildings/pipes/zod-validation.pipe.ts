import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

import { ValidationErrorHandler } from '../exceptions/validation-error.handler';

/**
 * Custom validation pipe for Zod schemas with enhanced error formatting.
 * Provides descriptive validation error messages for API consumers.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  /**
   * Creates a new ZodValidationPipe instance.
   * @param schema - The Zod schema to validate against
   */
  constructor(private readonly schema: ZodSchema) {}

  /**
   * Transforms and validates the input value using the provided Zod schema.
   * @param value - The value to validate
   * @param metadata - Metadata about the argument being validated
   * @returns The validated and transformed value
   * @throws BadRequestException with formatted validation errors
   */
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const path = this.getRequestPath(metadata);
        throw ValidationErrorHandler.createBadRequestException(error, path);
      }
      
      // Re-throw non-Zod errors
      throw error;
    }
  }

  /**
   * Extracts request path information from argument metadata.
   * @param metadata - The argument metadata
   * @returns A descriptive path string for error reporting
   */
  private getRequestPath(metadata: ArgumentMetadata): string {
    const { type, data } = metadata;
    
    switch (type) {
      case 'query':
        return data ? `query.${data}` : 'query';
      case 'body':
        return data ? `body.${data}` : 'body';
      case 'param':
        return data ? `param.${data}` : 'param';
      default:
        return type;
    }
  }
}

/**
 * Factory function to create a ZodValidationPipe for a specific schema.
 * @param schema - The Zod schema to validate against
 * @returns A new ZodValidationPipe instance
 */
export function createZodValidationPipe(schema: ZodSchema): ZodValidationPipe {
  return new ZodValidationPipe(schema);
}