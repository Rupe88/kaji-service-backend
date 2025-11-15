# E2E Testing Guide

This directory contains end-to-end (E2E) tests for the HR Platform backend.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Test Database**
   - Create a separate test database
   - Update `.env` with test database credentials
   - Or use environment variables:
     ```bash
     DATABASE_URL="postgresql://user:pass@localhost:5432/hr_platform_test"
     ```

3. **Run Prisma Migrations**
   ```bash
   npm run prisma:migrate
   ```

## Running Tests

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npm run test:e2e -- auth.e2e.test.ts
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run with Coverage
```bash
npm run test:coverage
```

## Test Files

### `auth.e2e.test.ts`
Tests authentication flow:
- User registration
- OTP verification
- Login with credentials
- Account lockout after failed attempts
- Token refresh
- Logout
- Profile retrieval

### `jobPosting.e2e.test.ts`
Tests job posting operations:
- Create job posting
- Get job posting
- List job postings with filters
- Update job posting
- Delete (deactivate) job posting
- Validation errors

### `kyc.e2e.test.ts`
Tests KYC operations:
- Create individual KYC profile
- Get KYC profile
- Update KYC profile
- Status updates
- Validation (age, consent, etc.)

### `skillMatching.e2e.test.ts`
Tests skill matching features:
- Match users to job postings
- Match jobs to users
- Search by skills and location
- Match score calculation

## Test Structure

Each test file follows this structure:

```typescript
describe('Feature E2E Tests', () => {
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    // Setup: Create test data
  });

  afterAll(async () => {
    // Cleanup: Remove test data
  });

  describe('POST /api/endpoint', () => {
    it('should perform action successfully', async () => {
      // Test implementation
    });
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data in `afterAll`
3. **Realistic Data**: Use realistic test data
4. **Error Cases**: Test both success and error scenarios
5. **Assertions**: Verify both status codes and response data

## Environment Variables for Testing

Create a `.env.test` file or set these variables:

```env
NODE_ENV=test
DATABASE_URL=postgresql://user:pass@localhost:5432/hr_platform_test
JWT_ACCESS_SECRET=test-secret-key
JWT_REFRESH_SECRET=test-refresh-secret
EMAIL_USER=test@example.com
EMAIL_PASS=test-password
```

## Troubleshooting

### Tests Failing Due to Database
- Ensure test database is created
- Run migrations: `npm run prisma:migrate`
- Check database connection string

### Tests Timing Out
- Increase `testTimeout` in `jest.e2e.config.js`
- Check database performance
- Ensure no hanging connections

### Port Already in Use
- Change `PORT` in test environment
- Kill existing processes on the port

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: |
    npm run test:e2e
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

## Notes

- Tests use a real database (not mocks)
- Tests should be run in a clean environment
- Consider using test containers for database isolation
- Tests may take longer due to real database operations

