# Implementation Plan: Buildings Pagination

## Overview

This implementation plan extends the existing Data Enrich API with pagination capabilities for building data retrieval. The approach adds a new `/paginated` endpoint while maintaining backward compatibility, implements efficient two-query pagination strategy, and extends MCP tools for AI agent access.

## Tasks

- [x] 1. Create pagination DTOs and interfaces
  - Create QueryBuildingsPaginatedDto with limit/offset parameters and existing filters
  - Create BuildingsPaginatedResponseDto with data array and meta object structure
  - Create BuildingsPaginatedQuery and BuildingsPaginatedResponse interfaces for service layer
  - Create PaginationMeta interface for metadata structure
  - _Requirements: 1.3, 1.4, 1.5, 4.1_

- [x] 1.1 Write property test for pagination response structure

  - **Property 1: Pagination Response Structure**
  - **Validates: Requirements 1.2, 1.5, 4.1**

- [x] 1.2 Write property test for parameter validation and defaults
  - **Property 2: Parameter Validation and Defaults**
  - **Validates: Requirements 1.3, 1.4**

- [x] 2. Extend BuildingsService with pagination methods
  - [x] 2.1 Implement findAllPaginated method with two-query approach
    - Add count query method to determine total matching records
    - Add paginated data query method with LIMIT and OFFSET
    - Implement shared filter condition building between count and data queries
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 2.2 Implement pagination metadata calculation
    - Add calculatePaginationMeta method for hasNext/hasPrevious logic
    - Handle edge cases where offset exceeds total records
    - Ensure metadata reflects filtered results, not entire table
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x]* 2.3 Write property test for filter compatibility with pagination
    - **Property 3: Filter Compatibility with Pagination**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x]* 2.4 Write property test for accurate metadata calculation
    - **Property 4: Accurate Metadata Calculation**
    - **Validates: Requirements 2.5, 3.1, 3.4**

  - [x]* 2.5 Write property test for navigation flag calculation
    - **Property 5: Navigation Flag Calculation**
    - **Validates: Requirements 3.2, 3.3**

- [x] 3. Add paginated endpoint to BuildingsController
  - [x] 3.1 Implement findAllPaginated controller method
    - Add GET /paginated endpoint with proper routing
    - Implement DTO validation and transformation to interfaces
    - Add comprehensive Swagger documentation with @ApiOperation and @ApiResponse
    - Implement error handling consistent with existing endpoints
    - _Requirements: 1.1, 1.2, 4.3_

  - [x]* 3.2 Write property test for response format consistency
    - **Property 6: Response Format Consistency**
    - **Validates: Requirements 4.2, 4.3, 4.5, 6.5**

  - [x]* 3.3 Write property test for empty result handling
    - **Property 7: Empty Result Handling**
    - **Validates: Requirements 4.4**

- [ ] 4. Extend MCP tools with pagination support
  - [ ] 4.1 Add paginated MCP tools to BuildingsMcpHttpTool
    - Implement search_buildings_basic_paginated tool for text filtering with pagination
    - Implement search_buildings_spatial_paginated tool for spatial filtering with pagination
    - Add comprehensive tool descriptions explaining pagination behavior for AI agents
    - Implement parameter validation for pagination parameters in MCP tools
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 4.2 Register paginated MCP tools in McpServerService
    - Add tool handlers to handleDynamicToolCall method for paginated tools
    - Add tool descriptions to generateDynamicTools method
    - Ensure proper async handling for paginated tool calls
    - _Requirements: 5.1, 5.2_

  - [ ]* 4.3 Write property test for MCP tool pagination support
    - **Property 8: MCP Tool Pagination Support**
    - **Validates: Requirements 5.3, 5.4**

- [ ] 5. Create comprehensive tests
  - [ ] 5.1 Write unit tests for pagination service methods
    - Test count query construction and execution
    - Test data query construction with LIMIT/OFFSET
    - Test pagination metadata calculation with various scenarios
    - Test edge cases (offset > total, limit = 0, no matching records)
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [ ] 5.2 Write unit tests for paginated controller endpoint
    - Test DTO validation for pagination parameters
    - Test HTTP status codes for various pagination scenarios
    - Test error handling for invalid pagination parameters
    - Test response formatting for paginated data and metadata
    - _Requirements: 1.3, 1.4, 4.3_

  - [ ] 5.3 Write unit tests for paginated MCP tools
    - Test tool parameter validation for pagination parameters
    - Test tool response formatting consistency with HTTP endpoints
    - Test error handling for invalid MCP pagination parameters
    - Test tool descriptions and schema definitions
    - _Requirements: 5.4, 5.5_

- [ ] 6. Create E2E tests for pagination functionality
  - [ ] 6.1 Write E2E tests for paginated HTTP endpoint
    - Test complete paginated request/response cycles with database integration
    - Test pagination with various filter combinations (text and spatial)
    - Test pagination metadata accuracy with real data
    - Test error scenarios and edge cases end-to-end
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.1_

  - [ ] 6.2 Write E2E tests for paginated MCP tools
    - Test paginated MCP tools via HTTP transport with database integration
    - Test parameter validation and error handling in MCP context
    - Test response format consistency between HTTP and MCP interfaces
    - Test pagination behavior with real spatial and text data
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 7. Performance optimization and documentation
  - [ ] 7.1 Optimize database queries for pagination performance
    - Ensure proper indexing on filtered columns for count queries
    - Optimize LIMIT/OFFSET queries for large datasets
    - Add query performance logging for pagination operations
    - _Requirements: 6.6_

  - [ ] 7.2 Update API documentation
    - Add pagination endpoint documentation with examples
    - Update Swagger schemas for pagination DTOs and responses
    - Document pagination behavior and best practices
    - Add MCP tool documentation for pagination features
    - _Requirements: 1.1, 5.5_

- [ ] 8. Final integration and testing
  - [ ] 8.1 Integration testing with existing functionality
    - Verify pagination doesn't break existing non-paginated endpoints
    - Test filter consistency between paginated and non-paginated endpoints
    - Verify MCP integration works with existing and new tools
    - _Requirements: 2.4, 4.3, 6.5_

  - [ ] 8.2 Performance testing with large datasets
    - Test pagination performance with large result sets
    - Verify memory usage remains stable with large offsets
    - Test concurrent paginated request handling
    - _Requirements: 6.6_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Two-query approach (count + data) ensures accurate pagination metadata
- Backward compatibility maintained with existing `/list` endpoint