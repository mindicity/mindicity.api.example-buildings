# Buildings API

A production-ready NestJS-based API for building data management with advanced PostGIS spatial capabilities and comprehensive property-based testing.

## 🚀 Features

### Core Functionality
- **RESTful API** for building data retrieval with comprehensive filtering
- **Text-based filtering** (cadastral code, municipality, building type, name, address)
- **Advanced spatial queries** using PostGIS (WKT polygon intersection)
- **GeoJSON geometry output** with EPSG:4326 coordinate system support
- **Comprehensive error handling** with descriptive error messages

### Developer Experience
- **OpenAPI/Swagger documentation** with interactive API explorer
- **Property-based testing** with fast-check for universal correctness validation
- **Structured logging** with correlation IDs for request tracing
- **Type-safe TypeScript** implementation throughout
- **Comprehensive test coverage** (unit, integration, and property-based tests)

### Production Ready
- **Docker support** with multi-stage builds
- **Health checks** and monitoring endpoints
- **Security best practices** (parameterized queries, input validation)
- **Performance optimized** with database indexing strategies
- **Deployment documentation** for multiple environments

## 📋 Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 13.x or higher with PostGIS extension
- **npm** 8.x or higher

## 🛠️ Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd buildings-api

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# DATABASE_HOST=localhost
# DATABASE_PORT=5432
# DATABASE_NAME=buildings_db
# DATABASE_USER=buildings_user
# DATABASE_PASSWORD=your_password
```

### 3. Database Setup

```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE buildings_db;
CREATE USER buildings_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE buildings_db TO buildings_user;

-- Connect to buildings_db
\c buildings_db;

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create buildings table (see docs/deployment/README.md for complete schema)
```

### 4. Running the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production build and start
npm run build
npm run start:prod
```

### 5. Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/health

# Access API documentation
open http://localhost:3000/api
```

## 🔧 API Usage

### Basic Queries

```bash
# Get all buildings
GET /buildings

# Filter by building type
GET /buildings?building_type=residential

# Search by name (partial match, case-insensitive)
GET /buildings?name=school

# Filter by municipality
GET /buildings?municipality_code=NYC
```

### Spatial Queries

```bash
# Buildings within a rectangular area (WKT POLYGON format)
GET /buildings?polygon=POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))

# Geographic coordinates (longitude, latitude)
GET /buildings?polygon=POLYGON((-74.1 40.7, -73.9 40.7, -73.9 40.8, -74.1 40.8, -74.1 40.7))
```

### Combined Filters

```bash
# Multiple text filters
GET /buildings?building_type=commercial&municipality_code=NYC

# Spatial + text filters
GET /buildings?polygon=POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))&building_type=residential
```

### Response Format

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "cadastral_code": "ABC123",
    "municipality_code": "NYC",
    "name": "Example Building",
    "building_type": "residential",
    "address": "123 Main Street, New York, NY",
    "geometry": {
      "type": "Point",
      "coordinates": [-74.006, 40.7128]
    },
    "basic_data": {
      "floors": 3,
      "year_built": 1995
    },
    "visible": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "updated_by": "system"
  }
]
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests (end-to-end)
npm run test:e2e

# Test coverage report
npm run test:cov

# Watch mode for development
npm run test:watch
```

### Test Coverage

The project includes comprehensive testing:

- **Unit Tests**: Service logic, DTOs, and utilities
- **Integration Tests**: Complete API request-response cycles
- **Property-Based Tests**: Universal correctness validation using fast-check
- **Spatial Tests**: PostGIS spatial query validation
- **Error Handling Tests**: Comprehensive error scenario coverage

### Property-Based Testing

The API uses property-based testing to validate universal properties:

- **Property 1-8**: Service layer correctness (filtering, spatial queries, error handling)
- **Property 9**: HTTP response format consistency
- **Property 10**: Error response consistency

## 📚 Documentation

### API Documentation
- **[Complete API Guide](docs/api/buildings-api.md)** - Comprehensive API documentation with examples
- **[Swagger UI](http://localhost:3000/api)** - Interactive API explorer (when running)
- **[OpenAPI JSON](http://localhost:3000/api-json)** - Machine-readable API specification

### Deployment Documentation
- **[Deployment Guide](docs/deployment/README.md)** - Complete deployment instructions for all environments
- **[Docker Setup](docs/deployment/README.md#docker-deployment)** - Containerized deployment
- **[Cloud Deployment](docs/deployment/README.md#cloud-deployment)** - AWS/GCP/Azure deployment guides

## 🏗️ Architecture

### Technology Stack
- **Framework**: NestJS with TypeScript (strict mode)
- **Database**: PostgreSQL 13+ with PostGIS extension
- **Testing**: Jest with fast-check for property-based testing
- **Documentation**: OpenAPI 3.0 with Swagger UI
- **Logging**: Structured JSON logging with correlation IDs
- **Validation**: Zod schemas with comprehensive error handling

### Project Structure

```
src/
├── modules/
│   └── buildings/           # Buildings module
│       ├── buildings.controller.ts    # HTTP endpoints
│       ├── buildings.service.ts       # Business logic
│       ├── dto/                       # Request/response DTOs
│       ├── interfaces/                # Internal interfaces
│       └── mcp/                       # MCP integration
├── common/                  # Shared utilities
├── config/                  # Configuration schemas
└── infrastructure/          # Database, logging, external services

test/
├── buildings.e2e-spec.ts   # Integration tests
└── *.spec.ts               # Unit tests
```

### Key Design Principles

1. **Separation of Concerns**: Controllers handle HTTP, Services handle business logic
2. **Type Safety**: Comprehensive TypeScript typing throughout
3. **Input Validation**: Zod schemas for all inputs with descriptive error messages
4. **Error Handling**: Graceful error handling with proper HTTP status codes
5. **Logging**: Structured logging with correlation IDs for request tracing
6. **Testing**: Property-based testing for universal correctness validation

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f app
```

### Traditional Deployment

```bash
# Build for production
npm run build

# Start production server
npm run start:prod
```

### Environment Variables

Key environment variables for deployment:

```bash
NODE_ENV=production
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=buildings_db
DATABASE_USER=buildings_user
DATABASE_PASSWORD=secure_password
LOG_LEVEL=info
```

See [Deployment Guide](docs/deployment/README.md) for complete configuration options.

## 🔒 Security

### Security Features
- **SQL Injection Protection**: Parameterized queries only
- **Input Validation**: Comprehensive validation with Zod schemas
- **Error Handling**: Secure error messages without sensitive data exposure
- **CORS Configuration**: Configurable CORS policies
- **Rate Limiting**: Built-in rate limiting support

### Production Security Checklist
- [ ] Use HTTPS in production
- [ ] Configure appropriate CORS policies
- [ ] Enable rate limiting
- [ ] Use environment variables for secrets
- [ ] Enable database SSL connections
- [ ] Configure proper firewall rules

## 📊 Performance

### Optimization Features
- **Database Indexing**: Optimized indexes for all query patterns
- **Spatial Indexing**: PostGIS GIST indexes for spatial queries
- **Connection Pooling**: Efficient database connection management
- **Structured Logging**: Minimal performance impact logging

### Performance Monitoring
- Response time tracking
- Database query performance logging
- Memory usage monitoring
- Error rate tracking

## 🤝 Contributing

### Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm run test

# Start development server
npm run start:dev

# Lint code
npm run lint

# Format code
npm run format
```

### Code Quality Standards
- TypeScript strict mode
- ESLint configuration enforced
- Comprehensive test coverage required
- Property-based testing for critical logic
- Structured logging throughout

## 📝 API Examples

### JavaScript/TypeScript

```typescript
// Using fetch API
const response = await fetch('/buildings?name=school&municipality_code=NYC');
const buildings = await response.json();

// Using axios
import axios from 'axios';

const buildings = await axios.get('/buildings', {
  params: {
    building_type: 'residential',
    polygon: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))'
  }
});
```

### Python

```python
import requests

# Basic query
response = requests.get('http://localhost:3000/buildings')
buildings = response.json()

# Spatial query
params = {
    'polygon': 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))',
    'building_type': 'residential'
}
response = requests.get('http://localhost:3000/buildings', params=params)
buildings = response.json()
```

### cURL

```bash
# Get all buildings
curl -X GET "http://localhost:3000/buildings"

# Spatial query with filters
curl -X GET "http://localhost:3000/buildings?polygon=POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))&building_type=residential"
```

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure PostGIS extension is installed

2. **Spatial Query Errors**
   - Verify WKT polygon format
   - Check coordinate system (EPSG:4326)
   - Ensure polygon is properly closed

3. **Performance Issues**
   - Check database indexes
   - Monitor query execution times
   - Review connection pool settings

### Getting Help

- Check the [API Documentation](docs/api/buildings-api.md)
- Review the [Deployment Guide](docs/deployment/README.md)
- Check application logs for error details
- Verify database connectivity and PostGIS installation

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Projects

This API is part of the Mindicity ecosystem and follows the standard architecture patterns for data enrichment services.