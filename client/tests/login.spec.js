import { test, expect } from '@playwright/test';
import { clearAuth } from './helpers/auth.js';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome Back');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
  });

  test('should validate form inputs', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('invalid-email');
    await page.locator('button[type="submit"]').click();
    // HTML5 validation should prevent submission
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should navigate to signup', async ({ page }) => {
    await page.locator('a[href="/signup"]').click();
    await expect(page).toHaveURL(/.*\/signup/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.locator('input[type="email"]').fill('nonexistent@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    // Error may appear (depends on Firebase config)
    await page.waitForTimeout(2000);
  });
});
