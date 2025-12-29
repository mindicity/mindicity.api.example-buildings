# Implementation Plan: Buildings API

## Overview

This implementation plan follows the Mindicity API bootstrap process and architecture patterns. The implementation will create a NestJS-based REST API with PostGIS integration, comprehensive filtering capabilities, and MCP tools for AI agent connectivity. The plan assumes the project will be bootstrapped from the official Mindicity template repository.

## Tasks

- [x] 1. Bootstrap Mindicity API project from template
  - Clone template repository from https://github.com/mindicity/mindicity.ecosystem.sdk.template-api.git
  - Execute bootstrap process to rename template → buildings API
  - Verify build, lint, and test commands pass
  - _Requirements: Project Setup_

- [x] 2. Implement core buildings module structure
  - [x] 2.1 Create buildings module files and directories
    - Generate NestJS module, controller, and service using CLI
    - Create dto/, interfaces/, mcp/, and test/ directories
    - Set up module imports and dependencies
    - _Requirements: 1.1, 8.1_

  - [x]* 2.2 Write property test for module structure
    - **Property 1: Complete Response Structure**
    - **Validates: Requirements 1.3, 1.5, 8.4**

- [ ] 3. Implement data models and validation
  - [x] 3.1 Create internal interfaces for building data
    - Define BuildingData, BuildingQuery, GeospatialQuery interfaces
    - Create PaginationMeta and PaginationOptions interfaces
    - _Requirements: 1.3, 2.1, 4.1_

  - [x] 3.2 Create Zod DTO schemas
    - Implement QueryBuildingsDto with text filtering validation
    - Create GeospatialQueryDto with WKT polygon validation
    - Define BuildingResponseDto and PaginationMetaDto
    - _Requirements: 3.1, 4.3, 7.4, 7.5_

  - [x]* 3.3 Write property test for input validation
    - **Property 8: Input Validation Error Handling**
    - **Validates: Requirements 4.4, 7.1, 7.4, 7.5**

- [ ] 4. Implement database service integration
  - [x] 4.1 Create database query methods in BuildingsService
    - Implement findAll() method using SqlQueryBuilder for standard queries
    - Create findByPolygon() method using raw SQL for PostGIS operations
    - Add countTotal() method for pagination metadata
    - _Requirements: 1.2, 2.1, 4.2, 8.3_

  - [ ]* 4.2 Write property test for default visibility filtering
    - **Property 2: Default Visibility Filtering**
    - **Validates: Requirements 1.4, 8.3**

  - [ ]* 4.3 Write property test for geospatial intersection
    - **Property 6: Geospatial Intersection**
    - **Validates: Requirements 4.2**

- [ ] 5. Implement text-based filtering functionality
  - [ ] 5.1 Add text filtering logic to BuildingsService
    - Implement name and address partial matching (ILIKE)
    - Add exact matching for cadastral_code, municipality_code, building_type
    - Support multiple filter combination with AND logic
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 5.2 Write property test for text filtering consistency
    - **Property 4: Text Filtering Consistency**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**

  - [ ]* 5.3 Write property test for multiple filter combination
    - **Property 5: Multiple Filter Combination**
    - **Validates: Requirements 3.7**

- [ ] 6. Implement pagination functionality
  - [ ] 6.1 Add pagination logic to BuildingsService
    - Implement limit and offset handling in queries
    - Create pagination metadata calculation
    - Handle edge cases (offset exceeding total records)
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [ ]* 6.2 Write property test for pagination behavior
    - **Property 3: Pagination Behavior**
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [ ]* 6.3 Write property test for empty result handling
    - **Property 9: Empty Result Handling**
    - **Validates: Requirements 7.3**

- [ ] 7. Implement geospatial filtering functionality
  - [ ] 7.1 Add PostGIS spatial query methods
    - Implement WKT polygon parsing and validation
    - Create ST_Intersects queries for spatial filtering
    - Support combination of spatial and text filters
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [ ]* 7.2 Write property test for combined spatial and text filtering
    - **Property 7: Combined Spatial and Text Filtering**
    - **Validates: Requirements 4.5**

- [ ] 8. Implement REST API controller
  - [ ] 8.1 Create BuildingsController with endpoints
    - Implement GET /buildings endpoint with query parameter support
    - Add proper Swagger documentation and validation
    - Implement error handling and response formatting
    - _Requirements: 1.1, 1.5, 7.1_

  - [ ]* 8.2 Write unit tests for controller endpoints
    - Test endpoint responses and error handling
    - Verify DTO validation and response formatting
    - _Requirements: 1.1, 7.1_

- [ ] 9. Checkpoint - Ensure core API functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement MCP tools for AI agent connectivity
  - [ ] 10.1 Create buildings MCP HTTP tool class
    - Implement get_buildings_list tool for basic search
    - Create search_buildings_geospatial tool for spatial queries
    - Add comprehensive tool definitions with usage guidance
    - _Requirements: 5.1, 5.2, 6.1, 6.2_

  - [ ] 10.2 Integrate MCP tools with McpServerService
    - Add BuildingsService to TransportDependencies interface
    - Register tool handlers in setupToolHandlers switch
    - Update createTransportDependencies function
    - _Requirements: 5.1, 6.1_

  - [ ]* 10.3 Write property test for MCP tool delegation
    - **Property 10: MCP Tool Delegation**
    - **Validates: Requirements 5.2, 5.4, 6.2**

  - [ ]* 10.4 Write property test for MCP parameter support
    - **Property 11: MCP Parameter Support**
    - **Validates: Requirements 5.3, 6.3, 6.4, 6.5**

  - [ ]* 10.5 Write property test for MCP error handling
    - **Property 12: MCP Error Handling**
    - **Validates: Requirements 5.5**

- [ ] 11. Implement comprehensive error handling
  - [ ] 11.1 Add validation error handling
    - Implement Zod validation error formatting
    - Add WKT format validation with descriptive errors
    - Create pagination parameter validation
    - _Requirements: 7.1, 7.4, 7.5_

  - [ ] 11.2 Add database error handling
    - Implement PostGIS error handling and logging
    - Add connection failure error responses
    - Create proper error correlation ID logging
    - _Requirements: 7.2, 8.1_

  - [ ]* 11.3 Write unit tests for error scenarios
    - Test validation error responses
    - Verify error message formatting and status codes
    - _Requirements: 7.1, 7.2_

- [ ] 12. Implement comprehensive testing suite
  - [ ] 12.1 Create E2E tests for all endpoints
    - Test all API endpoints with various parameter combinations
    - Verify MCP tool integration through HTTP transport
    - Test error scenarios and edge cases
    - _Requirements: All requirements_

  - [ ]* 12.2 Create property-based test suite
    - Implement all 12 correctness properties as property tests
    - Configure fast-check with minimum 100 iterations per test
    - Add proper test tagging and documentation
    - _Requirements: All testable requirements_

  - [ ]* 12.3 Add performance and load testing
    - Test API performance with large datasets
    - Verify spatial query performance with complex polygons
    - Test pagination performance with high offsets
    - _Requirements: 8.2_

- [ ] 13. Final integration and documentation
  - [ ] 13.1 Complete API documentation
    - Update Swagger/OpenAPI documentation
    - Add comprehensive endpoint examples
    - Document MCP tool usage and parameters
    - _Requirements: All requirements_

  - [ ] 13.2 Update project configuration
    - Configure environment variables for PostGIS connection
    - Update Docker configuration for deployment
    - Set up proper logging configuration
    - _Requirements: 8.1_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation follows Mindicity API architecture patterns
- Bootstrap process is mandatory and must be completed first
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- MCP integration is mandatory for AI agent connectivity