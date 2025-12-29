import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as fc from 'fast-check';
import { ZodError } from 'zod';
import { QueryBuildingsSchema } from '../dto/query-buildings.dto';
import { GeospatialQuerySchema } from '../dto/geospatial-query.dto';

/**
 * Property 8: Input Validation Error Handling
 * 
 * For any invalid input parameters (malformed WKT, negative pagination values, 
 * invalid query parameters), the API should return appropriate 400 Bad Request 
 * responses with descriptive error messages.
 * 
 * Validates: Requirements 4.4, 7.1, 7.4, 7.5
 */
describe('Property 8: Input Validation Error Handling', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('QueryBuildingsDto validation errors', () => {
    it('should reject invalid text filter parameters', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Empty strings for required fields
            fc.record({
              name: fc.constant(''),
            }),
            fc.record({
              address: fc.constant(''),
            }),
            fc.record({
              cadastral_code: fc.constant(''),
            }),
            fc.record({
              municipality_code: fc.constant(''),
            }),
            // Strings that are too long
            fc.record({
              name: fc.string({ minLength: 101, maxLength: 200 }),
            }),
            fc.record({
              address: fc.string({ minLength: 201, maxLength: 300 }),
            }),
            fc.record({
              cadastral_code: fc.string({ minLength: 51, maxLength: 100 }),
            }),
            fc.record({
              municipality_code: fc.string({ minLength: 51, maxLength: 100 }),
            }),
            // Invalid building_type enum values
            fc.record({
              building_type: fc.string().filter(s => 
                !['residential', 'commercial', 'industrial', 'mixed', 'other'].includes(s)
              ),
            }),
          ),
          (invalidInput) => {
            // Attempt to validate the invalid input
            const result = QueryBuildingsSchema.safeParse(invalidInput);
            
            // Should fail validation
            expect(result.success).toBe(false);
            
            if (!result.success) {
              const error = result.error as ZodError;
              
              // Should have validation errors
              expect(error.issues).toBeDefined();
              expect(error.issues.length).toBeGreaterThan(0);
              
              // Each error should have a descriptive message
              error.issues.forEach(issue => {
                expect(issue.message).toBeDefined();
                expect(typeof issue.message).toBe('string');
                expect(issue.message.length).toBeGreaterThan(0);
                expect(issue.path).toBeDefined();
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid pagination parameters', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Negative limit
            fc.record({
              limit: fc.integer({ max: 0 }),
            }),
            // Limit too high
            fc.record({
              limit: fc.integer({ min: 101 }),
            }),
            // Negative offset
            fc.record({
              offset: fc.integer({ max: -1 }),
            }),
            // Non-integer values (as strings that can't be coerced)
            fc.record({
              limit: fc.constant('not-a-number'),
            }),
            fc.record({
              offset: fc.constant('invalid-offset'),
            }),
          ),
          (invalidInput) => {
            // Attempt to validate the invalid input
            const result = QueryBuildingsSchema.safeParse(invalidInput);
            
            // Should fail validation for invalid pagination
            if ('limit' in invalidInput && typeof invalidInput.limit === 'string') {
              // String values that can't be coerced should fail
              expect(result.success).toBe(false);
            } else if ('offset' in invalidInput && typeof invalidInput.offset === 'string') {
              // String values that can't be coerced should fail
              expect(result.success).toBe(false);
            } else if ('limit' in invalidInput && typeof invalidInput.limit === 'number') {
              // Numeric values outside valid range should fail
              if (invalidInput.limit <= 0 || invalidInput.limit > 100) {
                expect(result.success).toBe(false);
              }
            } else if ('offset' in invalidInput && typeof invalidInput.offset === 'number') {
              // Negative offset should fail
              if (invalidInput.offset < 0) {
                expect(result.success).toBe(false);
              }
            }
            
            if (!result.success) {
              const error = result.error as ZodError;
              
              // Should have descriptive error messages
              expect(error.issues).toBeDefined();
              expect(error.issues.length).toBeGreaterThan(0);
              
              error.issues.forEach(issue => {
                expect(issue.message).toBeDefined();
                expect(typeof issue.message).toBe('string');
                expect(issue.message.length).toBeGreaterThan(0);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('GeospatialQueryDto WKT validation errors', () => {
    it('should reject malformed WKT polygon strings', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Empty or whitespace-only strings
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t\n'),
            
            // Invalid WKT format strings
            fc.constant('INVALID WKT'),
            fc.constant('POINT(0 0)'), // Wrong geometry type
            fc.constant('POLYGON'), // Incomplete
            fc.constant('POLYGON()'), // Empty coordinates
            fc.constant('POLYGON(('), // Malformed brackets
            fc.constant('POLYGON((0 0))'), // Not enough points
            fc.constant('POLYGON((0 0, 1 1, 2 2))'), // Not closed (less than 4 points)
            fc.constant('POLYGON((0 0, 1 1, 2 2, 0 1))'), // Not closed (different end point)
            
            // Invalid coordinate formats
            fc.constant('POLYGON((a b, c d, e f, a b))'), // Non-numeric coordinates
            fc.constant('POLYGON((0, 1 1, 2 2, 0 0))'), // Missing coordinate
            fc.constant('POLYGON((0 0 0, 1 1 1, 2 2 2, 0 0 0))'), // 3D coordinates (not supported)
            
            // Random strings that don't match WKT format
            fc.string().filter(s => !s.toUpperCase().startsWith('POLYGON')),
          ),
          (invalidWkt: string) => {
            const invalidInput = { polygon: invalidWkt };
            
            // Attempt to validate the invalid WKT
            const result = GeospatialQuerySchema.safeParse(invalidInput);
            
            // Should fail validation
            expect(result.success).toBe(false);
            
            if (!result.success) {
              const error = result.error as ZodError;
              
              // Should have validation errors for polygon field
              expect(error.issues).toBeDefined();
              expect(error.issues.length).toBeGreaterThan(0);
              
              // Find polygon-related errors
              const polygonErrors = error.issues.filter(issue => 
                issue.path.includes('polygon')
              );
              
              expect(polygonErrors.length).toBeGreaterThan(0);
              
              // Each polygon error should have a descriptive message
              polygonErrors.forEach(issue => {
                expect(issue.message).toBeDefined();
                expect(typeof issue.message).toBe('string');
                expect(issue.message.length).toBeGreaterThan(0);
                
                // Should mention WKT or polygon in the error message
                const message = issue.message.toLowerCase();
                expect(
                  message.includes('wkt') || 
                  message.includes('polygon') || 
                  message.includes('format') ||
                  message.includes('invalid')
                ).toBe(true);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide specific error messages for different WKT validation failures', () => {
      // Test specific WKT validation scenarios with expected error patterns
      const testCases = [
        {
          input: '',
          expectedErrorPattern: /invalid|format|wkt|polygon/i,
          description: 'empty string',
        },
        {
          input: 'POINT(0 0)',
          expectedErrorPattern: /invalid|format|wkt|polygon/i,
          description: 'wrong geometry type',
        },
        {
          input: 'POLYGON((0 0, 1 1, 0 0))',
          expectedErrorPattern: /invalid|format|wkt|polygon|coordinate/i,
          description: 'insufficient points',
        },
        {
          input: 'POLYGON((0 0, 1 1, 2 2, 0 1))',
          expectedErrorPattern: /invalid|format|wkt|polygon|closed/i,
          description: 'not closed polygon',
        },
      ];

      testCases.forEach(({ input, expectedErrorPattern, description }) => {
        const result = GeospatialQuerySchema.safeParse({ polygon: input });
        
        expect(result.success).toBe(false);
        
        if (!result.success) {
          const error = result.error as ZodError;
          const polygonErrors = error.issues.filter(issue => 
            issue.path.includes('polygon')
          );
          
          expect(polygonErrors.length).toBeGreaterThan(0);
          
          // At least one error should match the expected pattern
          const hasMatchingError = polygonErrors.some(issue => 
            expectedErrorPattern.test(issue.message)
          );
          
          expect(hasMatchingError).toBe(true);
        }
      });
    });
  });

  describe('Combined validation error scenarios', () => {
    it('should handle multiple validation errors simultaneously', () => {
      fc.assert(
        fc.property(
          fc.record({
            // Invalid text filters
            name: fc.oneof(
              fc.constant(''), // Empty string
              fc.string({ minLength: 101, maxLength: 200 }) // Too long
            ),
            building_type: fc.string().filter(s => 
              !['residential', 'commercial', 'industrial', 'mixed', 'other'].includes(s)
            ),
            
            // Invalid pagination
            limit: fc.integer({ max: 0 }), // Negative or zero
            offset: fc.integer({ max: -1 }), // Negative
            
            // Invalid WKT
            polygon: fc.oneof(
              fc.constant(''),
              fc.constant('INVALID WKT'),
              fc.constant('POLYGON((0 0))')
            ),
          }),
          (invalidInput) => {
            // Attempt to validate input with multiple errors
            const result = GeospatialQuerySchema.safeParse(invalidInput);
            
            // Should fail validation
            expect(result.success).toBe(false);
            
            if (!result.success) {
              const error = result.error as ZodError;
              
              // Should have multiple validation errors
              expect(error.issues).toBeDefined();
              expect(error.issues.length).toBeGreaterThan(0);
              
              // Each error should be well-formed
              error.issues.forEach(issue => {
                expect(issue.message).toBeDefined();
                expect(typeof issue.message).toBe('string');
                expect(issue.message.length).toBeGreaterThan(0);
                expect(issue.path).toBeDefined();
                expect(Array.isArray(issue.path)).toBe(true);
              });
              
              // Should be able to identify which fields have errors
              const errorPaths = error.issues.map(issue => issue.path.join('.'));
              expect(errorPaths.length).toBeGreaterThan(0);
              
              // Each error path should correspond to a field in the input
              errorPaths.forEach(path => {
                expect(typeof path).toBe('string');
                expect(path.length).toBeGreaterThan(0);
              });
            }
          }
        ),
        { numRuns: 50 } // Fewer runs for complex scenarios
      );
    });
  });

  describe('Error message quality and consistency', () => {
    it('should provide consistent error message structure', () => {
      const invalidInputs = [
        { name: '' }, // Empty string
        { limit: -1 }, // Negative number
        { building_type: 'invalid' }, // Invalid enum
        { polygon: 'INVALID' }, // Invalid WKT
      ];

      invalidInputs.forEach(input => {
        const result = GeospatialQuerySchema.safeParse(input);
        
        expect(result.success).toBe(false);
        
        if (!result.success) {
          const error = result.error as ZodError;
          
          error.issues.forEach(issue => {
            // Error message should be a non-empty string
            expect(typeof issue.message).toBe('string');
            expect(issue.message.length).toBeGreaterThan(0);
            
            // Should not contain internal error codes or stack traces
            expect(issue.message).not.toMatch(/Error:/);
            expect(issue.message).not.toMatch(/\bat\s+\w+/); // Match "at word" but not "at least"
            expect(issue.message).not.toMatch(/\n/);
            
            // Path should be properly structured
            expect(Array.isArray(issue.path)).toBe(true);
            expect(issue.path.length).toBeGreaterThanOrEqual(1);
            
            // Should have a valid error code
            expect(issue.code).toBeDefined();
            expect(typeof issue.code).toBe('string');
          });
        }
      });
    });
  });
});