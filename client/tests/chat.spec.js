import { test, expect } from '@playwright/test';
import { clearAuth, setAuth } from './helpers/auth.js';
import { TEST_USER, TEST_TOKEN } from './test-user.js';

test.describe('Chat Page', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    await clearAuth(page);
    await page.goto('/chat');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should display chat interface when authenticated', async ({ page }) => {
    await setAuth(page, TEST_TOKEN, TEST_USER);
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    // Use first() since there are multiple headings containing "ChatApp"
    await expect(page.getByRole('heading', { name: 'ChatApp' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('should logout and redirect to login', async ({ page }) => {
    await setAuth(page, TEST_TOKEN, TEST_USER);
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    await page.locator('button[title="Logout"]').click();
    await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });
  });
});
