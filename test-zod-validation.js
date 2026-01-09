const { z } = require('zod');

const QueryBuildingsPaginatedSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// Test with string values (should work with coerce)
console.log('Testing with valid string numbers:');
try {
  const result1 = QueryBuildingsPaginatedSchema.parse({ limit: '10', offset: '0' });
  console.log('✅ Success:', result1);
} catch (error) {
  console.log('❌ Error:', error.issues);
}

// Test with invalid string values
console.log('\nTesting with invalid string values:');
try {
  const result2 = QueryBuildingsPaginatedSchema.parse({ limit: 'abc', offset: 'xyz' });
  console.log('✅ Success:', result2);
} catch (error) {
  console.log('❌ Error details:');
  error.issues.forEach(issue => {
    console.log(`  - ${issue.path.join('.')}: ${issue.message} (received: ${issue.received}, expected: ${issue.expected})`);
  });
}

// Test with decimal values
console.log('\nTesting with decimal values:');
try {
  const result3 = QueryBuildingsPaginatedSchema.parse({ limit: '10.5', offset: '0' });
  console.log('✅ Success:', result3);
} catch (error) {
  console.log('❌ Error details:');
  error.issues.forEach(issue => {
    console.log(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
}