import { test, expect } from '@playwright/test';
import { clearAuth, setAuth } from './helpers/auth.js';
import { TEST_USER, TEST_TOKEN } from './test-user.js';

test.describe('Routing', () => {
  test('should redirect root to login when not authenticated', async ({ page }) => {
    await clearAuth(page);
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should redirect root to chat when authenticated', async ({ page }) => {
    await setAuth(page, TEST_TOKEN, TEST_USER);
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/chat/);
  });

  test('should protect chat route', async ({ page }) => {
    await clearAuth(page);
    await page.goto('/chat');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
