/**
 * Selectors for UI elements
 * Centralized selectors to make tests more maintainable
 */

export const LoginSelectors = {
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  submitButton: 'button[type="submit"]',
  signupLink: 'a[href="/signup"]',
  errorMessage: '[class*="bg-red"]',
  themeToggle: 'button:has(svg)',
  loadingSpinner: 'svg[class*="animate-spin"]',
};

export const SignupSelectors = {
  displayNameInput: 'input[id="displayName"]',
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  submitButton: 'button[type="submit"]',
  loginLink: 'a[href="/login"]',
  errorMessage: '[class*="bg-red"]',
  themeToggle: 'button:has(svg)',
  passwordHint: 'text=/Must be at least 6 characters/',
};

export const ChatSelectors = {
  contactList: '[class*="border-r"]',
  contactItem: '[class*="cursor-pointer"]',
  messageInput: 'input[placeholder*="message" i]',
  sendButton: 'button[type="submit"]:has(svg)',
  logoutButton: 'button[title="Logout"]',
  themeToggle: 'button:has(svg)',
  connectionStatus: 'text=/Connected|Disconnected/',
  welcomeScreen: 'text=/Welcome to ChatApp/',
  messageBubble: '[class*="rounded-2xl"]',
  emptyState: 'text=/No messages yet/',
  chatHeader: '[class*="border-b"]',
  backButton: 'button:has(svg)',
};

export const CommonSelectors = {
  logo: 'svg[viewBox="0 0 24 24"]',
  loading: '[class*="animate-spin"]',
};

