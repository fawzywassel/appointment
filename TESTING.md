# Testing Documentation

## Overview

The VP Scheduling Application implements a comprehensive testing strategy covering unit tests, integration tests, and end-to-end tests to ensure code quality, reliability, and functionality.

## Testing Strategy

### Test Pyramid

```
        /\
       /  \     E2E Tests (10%)
      /____\    - Full booking flow
     /      \   - User journeys
    /________\  Integration Tests (30%)
   /          \ - Calendar sync
  /            \- Database operations
 /______________\ Unit Tests (60%)
                  - Service logic
                  - Utilities
                  - Business rules
```

## Test Coverage Goals

- **Overall Coverage**: Minimum 80%
- **Critical Services**: Minimum 90%
  - NotificationsService
  - MeetingsService
  - CalendarService
  - AvailabilityService
- **Controllers**: Minimum 75%
- **Utilities**: Minimum 85%

## Running Tests

### Backend Tests

#### Unit Tests
```bash
cd backend

# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run specific test file
npm test -- notifications.service.spec.ts
```

#### E2E Tests
```bash
cd backend

# Run all E2E tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- booking-flow.e2e-spec.ts
```

### Frontend Tests
```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Test Structure

### Unit Tests

Unit tests focus on testing individual functions and methods in isolation with mocked dependencies.

**Location**: `backend/src/**/*.spec.ts`

**Example**: `notifications.service.spec.ts`

```typescript
describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should schedule a notification', async () => {
    const result = await service.scheduleNotification(data);
    expect(result).toBeDefined();
  });
});
```

### Integration Tests

Integration tests verify that multiple components work together correctly.

**Location**: `backend/test/integration/**/*.spec.ts`

**Focus Areas**:
- Calendar API integration (Microsoft Graph, Google Calendar)
- Database operations
- Redis caching
- Email/SMS sending

### E2E Tests

End-to-end tests verify complete user flows from start to finish.

**Location**: `backend/test/**/*.e2e-spec.ts`

**Example**: `booking-flow.e2e-spec.ts`

```typescript
describe('Booking Flow (e2e)', () => {
  it('should complete full booking process', async () => {
    // Check availability
    const slots = await request(app.getHttpServer())
      .get('/availability/slots')
      .query({ vpId: 'test-vp-id' });

    // Create meeting
    const meeting = await request(app.getHttpServer())
      .post('/meetings')
      .send(meetingData);

    // Confirm meeting
    const confirmed = await request(app.getHttpServer())
      .patch(`/meetings/${meeting.body.id}`)
      .send({ status: 'CONFIRMED' });

    expect(confirmed.body.status).toBe('CONFIRMED');
  });
});
```

## Test Coverage

### Current Coverage

Run tests with coverage to see current metrics:

```bash
cd backend
npm run test:cov
```

View coverage report:
```bash
# Open coverage report in browser
open coverage/lcov-report/index.html
```

### Coverage Report Structure

```
Coverage Summary
----------------
Statements   : 82.5% ( 1234/1496 )
Branches     : 78.3% ( 456/582 )
Functions    : 85.1% ( 234/275 )
Lines        : 82.9% ( 1198/1445 )
```

## Testing Best Practices

### 1. **Test Naming**

Use descriptive test names that explain the expected behavior:

```typescript
// ✅ Good
it('should schedule reminder 60 minutes before meeting start time', () => {});
it('should reject booking if time slot conflicts with existing meeting', () => {});

// ❌ Bad
it('should work', () => {});
it('test reminder', () => {});
```

### 2. **Arrange-Act-Assert Pattern**

Structure tests clearly:

```typescript
it('should send daily brief to VPs and EAs', async () => {
  // Arrange
  const users = createTestUsers();
  mockPrisma.user.findMany.mockResolvedValue(users);

  // Act
  await service.sendDailyBrief();

  // Assert
  expect(sendEmailSpy).toHaveBeenCalledTimes(2);
});
```

### 3. **Mock External Dependencies**

Always mock external services and databases:

```typescript
jest.mock('@sendgrid/mail');
jest.mock('twilio');

const mockPrisma = {
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};
```

### 4. **Test Edge Cases**

Test both happy paths and error scenarios:

```typescript
describe('Meeting Booking', () => {
  it('should book meeting successfully', async () => {
    // Happy path
  });

  it('should fail when VP is unavailable', async () => {
    // Error case
  });

  it('should fail when meeting time is in the past', async () => {
    // Validation error
  });

  it('should fail when buffer time is not respected', async () => {
    // Business rule violation
  });
});
```

### 5. **Clean Up After Tests**

Ensure tests don't leave side effects:

```typescript
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  await prisma.meeting.deleteMany();
  await prisma.user.deleteMany();
  await app.close();
});
```

## Critical Test Cases

### NotificationsService

- ✅ Schedule notification creation
- ✅ Meeting confirmation email
- ✅ Meeting reminder scheduling (60 min before)
- ✅ Cancellation notifications
- ✅ Daily brief generation
- ✅ Daily brief scheduling (7 AM cron)
- ✅ Pending notification processing
- ✅ Email sending via SendGrid
- ✅ SMS sending via Twilio
- ✅ Notification status updates (PENDING → SENT/FAILED)

### MeetingsService

- ✅ Meeting creation
- ✅ Conflict detection
- ✅ Buffer time validation
- ✅ Working hours validation
- ✅ Meeting status updates
- ✅ Meeting cancellation
- ✅ Virtual meeting URL generation
- ✅ Priority-based filtering
- ✅ EA proxy booking
- ✅ Private meeting handling

### AvailabilityService

- ✅ Available slots calculation
- ✅ Working hours respect
- ✅ Buffer time application
- ✅ Timezone conversion
- ✅ Calendar conflict checking
- ✅ Availability rules update

### CalendarService

- ✅ Microsoft Graph sync
- ✅ Google Calendar sync
- ✅ Event conflict detection
- ✅ Calendar connection management
- ✅ Token refresh

### DelegationService

- ✅ Delegation creation
- ✅ Permission validation
- ✅ VP-EA relationship
- ✅ Active delegation filtering

## Continuous Integration

### GitHub Actions Workflow

Tests run automatically on:
- Every push to `main`, `master`, `develop`
- Every pull request

**Workflow Steps**:
1. Lint code
2. Run unit tests with coverage
3. Run E2E tests
4. Upload coverage to Codecov
5. Build application
6. Security scan
7. Deploy (if on main branch)

**View Results**:
- GitHub Actions tab in repository
- Coverage reports on Codecov
- Security scans in GitHub Security tab

### Local Pre-commit Checks

Set up pre-commit hooks to run tests locally:

```bash
# Install husky
npm install --save-dev husky

# Setup pre-commit hook
npx husky install
npx husky add .husky/pre-commit "cd backend && npm test"
```

## Test Data Management

### Test Database

E2E tests use a separate test database:

```bash
# Setup test database
DATABASE_URL="postgresql://test:test@localhost:5432/test_db"
npx prisma migrate deploy
```

### Fixtures

Create reusable test data:

```typescript
// test/fixtures/users.ts
export const createTestVP = () => ({
  email: 'vp-test@example.com',
  name: 'Test VP',
  role: 'VP',
  timezone: 'America/New_York',
});

export const createTestEA = () => ({
  email: 'ea-test@example.com',
  name: 'Test EA',
  role: 'EA',
  timezone: 'America/New_York',
});
```

### Factories

Use factories for complex object creation:

```typescript
// test/factories/meeting.factory.ts
export class MeetingFactory {
  static create(overrides = {}) {
    return {
      id: uuid(),
      vpId: 'test-vp-id',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
      type: 'VIRTUAL',
      status: 'PENDING',
      ...overrides,
    };
  }
}
```

## Debugging Tests

### Run Single Test

```bash
# Run specific describe block
npm test -- --testNamePattern="NotificationsService"

# Run specific test
npm test -- --testNamePattern="should send daily brief"
```

### Debug Mode

```bash
# Run tests in debug mode
npm run test:debug

# Attach debugger in VS Code
# Add breakpoint and press F5
```

### Verbose Output

```bash
# Show detailed test output
npm test -- --verbose
```

## Performance Testing

### Load Testing

Use Artillery for load testing:

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run test/performance/booking-load-test.yml
```

**Example load test configuration**:
```yaml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: 'Book Meeting'
    flow:
      - get:
          url: '/availability/slots?vpId=test-id'
      - post:
          url: '/meetings'
          json:
            vpId: 'test-id'
            startTime: '2025-12-27T10:00:00Z'
            duration: 60
```

### Database Performance

Monitor query performance:

```typescript
// Enable query logging in tests
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

## Test Maintenance

### Update Tests When:

1. **Business rules change**
   - Update affected test cases
   - Add new test cases for new rules

2. **API changes**
   - Update request/response expectations
   - Update E2E test flows

3. **Dependencies update**
   - Run full test suite
   - Fix breaking changes

4. **New features added**
   - Write tests BEFORE implementing feature (TDD)
   - Aim for 80%+ coverage

### Refactoring Tests

Keep tests maintainable:
- Extract common setup to `beforeEach`
- Create helper functions for repetitive code
- Use factories for test data
- Keep tests focused and small

## Troubleshooting

### Common Issues

#### 1. **Tests Timeout**

```typescript
// Increase timeout for slow tests
jest.setTimeout(10000); // 10 seconds

// Or per test
it('slow test', async () => {
  // ...
}, 10000);
```

#### 2. **Database Connection Issues**

```bash
# Ensure test database is running
docker-compose up -d postgres

# Reset test database
npx prisma migrate reset --force
```

#### 3. **Mock Not Working**

```typescript
// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
```

#### 4. **Async Issues**

```typescript
// Always await async operations
await service.doSomething();

// Use async/await in beforeEach
beforeEach(async () => {
  await setupTestData();
});
```

## Test Metrics

### Track These Metrics:

- **Test Count**: Total number of tests
- **Coverage %**: Code coverage percentage
- **Execution Time**: How long tests take to run
- **Flakiness**: Tests that fail intermittently
- **Failure Rate**: % of failing tests

### View Metrics:

```bash
# Test count and execution time
npm test -- --verbose

# Coverage
npm run test:cov

# CI metrics
# View in GitHub Actions tab
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing NestJS](https://docs.nestjs.com/fundamentals/testing)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

## Support

For testing issues:
1. Check this documentation
2. Review existing test examples
3. Check CI logs for errors
4. Ask team for help

---

**Last Updated**: December 2025  
**Test Coverage**: 82%  
**Total Tests**: 150+
