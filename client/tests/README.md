# Frontend Test Suite

Playwright E2E tests for ChatApp frontend.

## Test Coverage (14 tests)

- **login.spec.js** - Login form, validation, navigation
- **signup.spec.js** - Signup form, password validation, account creation
- **chat.spec.js** - Authentication protection, chat interface, logout
- **routing.spec.js** - Route protection and redirects

## Running Tests

```bash
npm test              # Run all tests
npm run test:ui       # Interactive UI mode
npm run test:headed   # See browser while running
```

## Test Structure

- `test-user.js` - Shared test user configuration
- `helpers/auth.js` - Authentication utilities
- `playwright.config.js` - Playwright configuration
