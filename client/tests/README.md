# Frontend Test Suite

Essential end-to-end tests for the ChatApp frontend using Playwright.

## Test Coverage (13 tests)

1. **login.spec.js** (4 tests)
   - Form display
   - Input validation
   - Navigation to signup
   - Error handling

2. **signup.spec.js** (3 tests)
   - Form display
   - Password validation
   - Navigation to login

3. **chat.spec.js** (3 tests)
   - Authentication protection
   - Chat interface display
   - Logout functionality

4. **routing.spec.js** (3 tests)
   - Route protection
   - Redirects based on auth state

## Running Tests

```bash
# Run all tests
npm test

# Run with UI (recommended)
npm run test:ui

# Run in headed mode
npm run test:headed
```

## Fix Applied

**Issue**: localStorage SecurityError  
**Cause**: Accessing localStorage before page navigation  
**Solution**: Navigate to a page first in `clearAuth()` and `setAuth()` helpers

```javascript
// Before accessing localStorage, ensure page has navigated
if (!page.url() || page.url() === 'about:blank') {
  await page.goto('/');
}
```

## Test Structure

- **Helpers**: `helpers/auth.js` - Authentication utilities
- **Selectors**: `helpers/selectors.js` - Centralized selectors (optional)
- **Config**: `playwright.config.js` - Playwright configuration
