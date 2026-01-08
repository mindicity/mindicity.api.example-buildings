# Implementation Plan: Data Enrich API

## Overview

This implementation plan creates a NestJS-based API for building data retrieval with PostGIS spatial capabilities. The approach follows Mindicity architecture patterns, starting with template bootstrap, then implementing core functionality, and finally adding MCP integration for AI agents.

## Tasks

- [x] 1. Bootstrap Mindicity API project ✅ **COMPLETED**
  - ✅ Clone official template repository from https://github.com/mindicity/mindicity.ecosystem.sdk.template-api.git
  - ✅ Execute complete bootstrap process to rename template → data-enrich API
  - ✅ Rename template module to buildings module
  - ✅ Configure environment and verify build/test success (593 tests passed, 95.04% coverage)
  - _Requirements: 5.1, 5.2_

- [x] 2. Implement core buildings module structure
  - [x] 2.1 Create buildings module with NestJS CLI
    - Generate module, controller, and service files
    - Create dto/, interfaces/, mcp/, test/ directories
    - _Requirements: 1.1, 5.5_

  - [x] 2.2 Define data models and DTOs
    - Create QueryBuildingsDto with Zod validation for all filter parameters
    - Create BuildingResponseDto with all required fields
    - Create BuildingsQuery and BuildingData interfaces for service layer
    - _Requirements: 1.2, 1.3, 5.7_

  - [x] 2.3 Write property test for complete field response

    - **Property 1: Complete Field Response**
    - **Validates: Requirements 1.2, 1.3**

- [ ] 3. Implement database integration and spatial queries
  - [ ] 3.1 Create buildings service with database integration
    - Implement findAll method with SqlQueryBuilder for basic queries
    - Add ContextLoggerService integration with proper trace logging
    - _Requirements: 1.1, 5.3, 5.4_

  - [ ] 3.2 Implement text filtering capabilities
    - Add exact matching for cadastral_code, municipality_code, building_type
    - Add case-insensitive partial matching for name and address using ILIKE
    - Implement multiple filter combination with AND logic
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 3.3 Write property tests for text filtering
    - **Property 4: Exact Field Matching**
    - **Property 5: Partial Text Matching**
    - **Property 6: Multiple Filter Combination**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

- [ ] 4. Implement PostGIS spatial functionality
  - [ ] 4.1 Add spatial query capabilities
    - Implement WKT polygon validation using ST_GeomFromText
    - Add spatial intersection queries using ST_Intersects
    - Convert geometry to GeoJSON using ST_AsGeoJSON
    - Handle EPSG:4326 coordinate system properly
    - _Requirements: 3.1, 3.3, 6.1, 6.2, 6.3, 6.4_

  - [ ] 4.2 Implement spatial error handling
    - Add validation for WKT polygon format
    - Return descriptive error messages for invalid spatial input
    - Handle empty result sets gracefully
    - _Requirements: 3.2, 3.4, 6.5_

  - [ ]* 4.3 Write property tests for spatial functionality
    - **Property 7: Spatial Intersection**
    - **Property 8: Error Handling for Invalid Input**
    - **Validates: Requirements 3.1, 3.2**

- [ ] 5. Implement controller and API endpoints
  - [ ] 5.1 Create buildings controller
    - Implement GET /buildings/list endpoint
    - Add proper DTO validation and transformation
    - Implement error handling and HTTP status codes
    - Add Swagger documentation with @ApiTags and @ApiOperation
    - _Requirements: 1.1, 1.2_

  - [ ] 5.2 Add visibility filtering and geometry formatting
    - Ensure only visible=true buildings returned by default
    - Convert PostGIS geometry to GeoJSON format in responses
    - _Requirements: 1.4, 1.5_

  - [ ]* 5.3 Write property tests for API responses
    - **Property 2: GeoJSON Geometry Format**
    - **Property 3: Visible Buildings Filter**
    - **Validates: Requirements 1.4, 1.5**

- [ ] 6. Checkpoint - Ensure core API functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement MCP integration
  - [ ] 7.1 Create buildings MCP HTTP tool
    - Create buildings-mcp-http.tool.ts following naming convention
    - Add service to TransportDependencies interface
    - Update createTransportDependencies function
    - _Requirements: 4.1, 4.2_

  - [ ] 7.2 Implement MCP tool methods
    - Create search_buildings_basic tool for text filtering
    - Create search_buildings_spatial tool for polygon filtering
    - Add comprehensive tool descriptions for AI agent understanding
    - Implement proper parameter validation and error handling
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 7.3 Register MCP tools in server
    - Inject service in McpServerService constructor
    - Add tool handlers to setupToolHandlers switch statement
    - Add tool descriptions to ListToolsRequestSchema
    - _Requirements: 4.1, 4.2_

  - [ ]* 7.4 Write property test for MCP JSON responses
    - **Property 9: MCP JSON Response Format**
    - **Validates: Requirements 4.3**

- [ ]* 7.5 Create MCP E2E tests
  - Test both basic and spatial MCP tools
  - Verify tool parameter validation
  - Test error handling for invalid MCP inputs
  - _Requirements: 4.1, 4.2, 4.5_

- [ ] 8. Final integration and testing
  - [ ] 8.1 Wire all components together
    - Update app.module.ts to import BuildingsModule
    - Update routes.config.ts with BUILDINGS route constant
    - Ensure proper dependency injection throughout
    - _Requirements: 5.5_

  - [ ] 8.2 Add comprehensive error handling
    - Implement database connection error handling
    - Add spatial query error handling with meaningful messages
    - Ensure consistent error format across HTTP and MCP interfaces
    - _Requirements: 5.6, 6.5_

  - [ ]* 8.3 Write integration tests
    - Test complete request/response cycles
    - Test database integration with PostGIS functions
    - Test error propagation through all layers
    - _Requirements: 1.1, 3.1, 4.3_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- MCP tools provide HTTP transport by default for complete functionality