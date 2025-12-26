/**
 * Authentication Helper Functions
 * Utility functions for managing authentication state in tests
 */

/**
 * Clear all authentication data from localStorage
 * Must navigate to a page first to access localStorage
 */
export async function clearAuth(page) {
  // Navigate to any page first to get a valid context
  if (!page.url() || page.url() === 'about:blank') {
    await page.goto('/');
  }
  await page.evaluate(() => {
    localStorage.removeItem('chatToken');
    localStorage.removeItem('chatUser');
  });
}

/**
 * Set authentication token and user data in localStorage
 * Must navigate to a page first to access localStorage
 */
export async function setAuth(page, token, user) {
  // Navigate to any page first to get a valid context
  if (!page.url() || page.url() === 'about:blank') {
    await page.goto('/');
  }
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('chatToken', token);
      localStorage.setItem('chatUser', JSON.stringify(user));
    },
    { token, user }
  );
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page) {
  return await page.evaluate(() => {
    return !!localStorage.getItem('chatToken');
  });
}

/**
 * Get current user from localStorage
 */
export async function getCurrentUser(page) {
  return await page.evaluate(() => {
    const userStr = localStorage.getItem('chatUser');
    return userStr ? JSON.parse(userStr) : null;
  });
}

/**
 * Wait for authentication to be set
 */
export async function waitForAuth(page, timeout = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const authenticated = await isAuthenticated(page);
    if (authenticated) {
      return true;
    }
    await page.waitForTimeout(100);
  }
  return false;
}

