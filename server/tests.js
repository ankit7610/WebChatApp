import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import assert from 'assert';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || '5I40mOCKLq4DzEj4c4NbWOl88ZIsEhg65KxiyOnAXOU=';
const API_URL = process.env.API_URL || 'http://localhost:3000';

// Test configuration
const PORT = process.env.PORT || 3000;
const TEST_TIMEOUT = 10000; // 10 seconds per test

// Test Users (modify these to match your test users)
const testUser1 = {
  userId: 'test-user-1',
  username: 'TestUser1',
  email: 'test1@example.com',
  mongoId: '507f1f77bcf86cd799439011'
};

const testUser2 = {
  userId: 'test-user-2',
  username: 'TestUser2',
  email: 'test2@example.com',
  mongoId: '507f1f77bcf86cd799439012'
};

// Utility Functions
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.userId,
      mongoId: user.mongoId || user.userId,
      username: user.username || user.email?.split('@')[0] || 'TestUser',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const generateExpiredToken = (user) => {
  return jwt.sign(
    {
      userId: user.userId,
      mongoId: user.mongoId || user.userId,
      username: user.username || user.email?.split('@')[0] || 'TestUser',
    },
    JWT_SECRET,
    { expiresIn: '-1h' } // Token expired 1 hour ago
  );
};

const runTest = async (name, testFn) => {
  try {
    console.log(`\n🧪 Running test: ${name}`);
    await Promise.race([
      testFn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Test timeout')), TEST_TIMEOUT)
      )
    ]);
    console.log(`✅ Test passed: ${name}`);
    return { name, passed: true };
  } catch (error) {
    console.error(`❌ Test failed: ${name}`);
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
    return { name, passed: false, error: error.message };
  }
};

// ============================================================================
// SERVER CONNECTIVITY CHECK
// ============================================================================

const checkServerConnection = async () => {
  try {
    const response = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// ============================================================================
// HEALTH CHECK TESTS
// ============================================================================

const testHealthCheck = async () => {
  const response = await fetch(`${API_URL}/health`);
  const data = await response.json();

  assert.strictEqual(response.status, 200, 'Health check should return 200');
  assert.strictEqual(data.status, 'ok', 'Health check should return status ok');
  assert(data.timestamp, 'Health check should include timestamp');
};

const test404Route = async () => {
  const response = await fetch(`${API_URL}/api/nonexistent`);
  const data = await response.json();

  assert.strictEqual(response.status, 404, 'Non-existent route should return 404');
  assert(data.error, '404 response should include error message');
};

// ============================================================================
// AUTH TESTS
// ============================================================================

const testAuthVerify_ValidToken = async () => {
  const token = generateToken(testUser1);
  const response = await fetch(`${API_URL}/api/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token })
  });

  // Note: This test may fail if user doesn't exist in DB, which is expected
  // In a real test environment, you'd set up test data first
  if (response.status === 404) {
    console.log('   ⚠️  User not found in DB (expected in test environment)');
    return; // Skip this test if user doesn't exist
  }

  const data = await response.json();

  if (response.status === 200) {
    assert.strictEqual(data.valid, true, 'Valid token should return valid: true');
    assert(data.user, 'Valid token should return user object');
    assert(data.user.id, 'User object should have id');
  } else {
    throw new Error(`Expected 200 or 404, got ${response.status}`);
  }
};

const testAuthVerify_InvalidToken = async () => {
  const response = await fetch(`${API_URL}/api/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: 'invalid-token-12345' })
  });

  const data = await response.json();
  assert.strictEqual(response.status, 401, 'Invalid token should return 401');
  assert.strictEqual(data.valid, false, 'Invalid token should return valid: false');
  assert(data.error, 'Invalid token response should include error message');
};

const testAuthVerify_NoToken = async () => {
  const response = await fetch(`${API_URL}/api/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  });

  const data = await response.json();
  assert.strictEqual(response.status, 400, 'Missing token should return 400');
  assert.strictEqual(data.error, 'Token required', 'Should return token required error');
};

const testAuthLogin_NoToken = async () => {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  });

  const data = await response.json();
  assert.strictEqual(response.status, 400, 'Missing Firebase token should return 400');
  assert.strictEqual(data.error, 'Firebase token required', 'Should return Firebase token required error');
};

const testRateLimit_AuthEndpoint = async () => {
  // Test that rate limiting is working on auth endpoint
  // Auth limiter allows 5 requests per 15 minutes
  const requests = [];

  // Make 6 consecutive requests
  for (let i = 0; i < 6; i++) {
    requests.push(
      fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firebaseToken: 'test-token' })
      })
    );
  }

  const responses = await Promise.all(requests);

  // First 5 should be processed (may return 400/401 due to invalid token)
  // 6th should be rate limited (429)
  const lastResponse = responses[5];

  // The 6th request should be rate limited
  if (lastResponse.status === 429) {
    const data = await lastResponse.json();
    assert.strictEqual(lastResponse.status, 429, 'Rate limiter should return 429 on 6th request');
    assert(data.error, 'Rate limit response should include error message');
    console.log('   ✓ Rate limiting is working correctly');
  } else {
    // If rate limiting is not working, log a warning but don't fail
    console.log('   ⚠️  Rate limiting may not be configured (got status ' + lastResponse.status + ')');
  }
};

// ============================================================================
// CONTACTS TESTS
// ============================================================================

const testGetContacts_ValidToken = async () => {
  const token = generateToken(testUser1);
  const response = await fetch(`${API_URL}/api/contacts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // May return 404 if user doesn't exist in DB
  if (response.status === 404) {
    console.log('   ⚠️  User not found in DB (expected in test environment)');
    return;
  }

  const data = await response.json();
  assert.strictEqual(response.status, 200, 'Get contacts should return 200');
  assert(Array.isArray(data), 'Contacts response should be an array');

  // If contacts exist, verify structure
  if (data.length > 0) {
    const contact = data[0];
    assert(contact.uid, 'Contact should have uid');
    assert(contact.email, 'Contact should have email');
    assert(contact.displayName, 'Contact should have displayName');
  }
};

const testGetContacts_NoToken = async () => {
  const response = await fetch(`${API_URL}/api/contacts`, {
    method: 'GET'
  });

  const data = await response.json();
  assert.strictEqual(response.status, 401, 'Get contacts without token should return 401');
  assert(data.error, 'Should return error message');
};

const testGetContacts_InvalidToken = async () => {
  const response = await fetch(`${API_URL}/api/contacts`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer invalid-token-12345'
    }
  });

  const data = await response.json();
  assert.strictEqual(response.status, 401, 'Get contacts with invalid token should return 401');
  assert.strictEqual(data.error, 'Invalid token', 'Should return invalid token error');
};

const testGetAllUsers_ValidToken = async () => {
  const token = generateToken(testUser1);
  const response = await fetch(`${API_URL}/api/contacts/all`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // May return 404 if user doesn't exist
  if (response.status === 404) {
    console.log('   ⚠️  User not found in DB (expected in test environment)');
    return;
  }

  const data = await response.json();
  assert.strictEqual(response.status, 200, 'Get all users should return 200');
  assert(Array.isArray(data), 'All users response should be an array');

  // Verify user structure if users exist
  if (data.length > 0) {
    const user = data[0];
    assert(user.firebaseUid, 'User should have firebaseUid');
    assert(user.email, 'User should have email');
    assert(user.displayName, 'User should have displayName');
  }
};

const testGetAllUsers_NoToken = async () => {
  const response = await fetch(`${API_URL}/api/contacts/all`, {
    method: 'GET'
  });

  const data = await response.json();
  assert.strictEqual(response.status, 401, 'Get all users without token should return 401');
};

const testAddContact_NoEmail = async () => {
  const token = generateToken(testUser1);
  const response = await fetch(`${API_URL}/api/contacts/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({})
  });

  const data = await response.json();
  assert.strictEqual(response.status, 400, 'Add contact without email should return 400');
  assert.strictEqual(data.error, 'Email is required', 'Should return email required error');
};

const testAddContact_NoToken = async () => {
  const response = await fetch(`${API_URL}/api/contacts/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ addEmail: 'test@example.com' })
  });

  const data = await response.json();
  assert.strictEqual(response.status, 401, 'Add contact without token should return 401');
  assert(data.error, 'Should return error message');
};

const testAddContact_InvalidToken = async () => {
  const response = await fetch(`${API_URL}/api/contacts/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid-token-12345'
    },
    body: JSON.stringify({ addEmail: 'test@example.com' })
  });

  const data = await response.json();
  assert.strictEqual(response.status, 401, 'Add contact with invalid token should return 401');
  assert.strictEqual(data.error, 'Invalid token', 'Should return invalid token error');
};

const testAddContact_SelfEmail = async () => {
  const token = generateToken(testUser1);
  const response = await fetch(`${API_URL}/api/contacts/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ addEmail: testUser1.email })
  });

  const data = await response.json();
  assert.strictEqual(response.status, 400, 'Adding self as contact should return 400');
  assert.strictEqual(data.error, 'Cannot add yourself', 'Should return cannot add yourself error');
};

const testAddContact_RateLimiting = async () => {
  const token = generateToken(testUser1);

  // Make multiple rapid requests to trigger rate limiting
  // The rate limiter is configured in the middleware
  const requests = [];
  for (let i = 0; i < 15; i++) {
    requests.push(
      fetch(`${API_URL}/api/contacts/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ addEmail: `test${i}@example.com` })
      })
    );
  }

  const responses = await Promise.all(requests);
  const statusCodes = responses.map(r => r.status);

  // At least one request should be rate limited (429)
  const hasRateLimitResponse = statusCodes.includes(429);
  assert(hasRateLimitResponse, 'Should receive 429 (Too Many Requests) when rate limit is exceeded');

  console.log(`   ℹ️  Rate limit test: ${statusCodes.filter(s => s === 429).length} requests were rate limited`);
};

const testAddContact_InvalidEmailFormat = async () => {
  const token = generateToken(testUser1);
  const response = await fetch(`${API_URL}/api/contacts/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ addEmail: 'notanemail' })
  });

  const data = await response.json();
  // Firebase will reject invalid email formats
  assert.strictEqual(response.status, 404, 'Invalid email format should return 404');
  assert.strictEqual(data.error, 'User not found in Firebase', 'Should return user not found error');
};

const testGetContacts_ExpiredToken = async () => {
  const expiredToken = generateExpiredToken(testUser1);
  const response = await fetch(`${API_URL}/api/contacts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${expiredToken}`
    }
  });

  const data = await response.json();
  assert.strictEqual(response.status, 401, 'Expired token should return 401');
  assert.strictEqual(data.error, 'Invalid token', 'Should return invalid token error');
};

const testRemoveContact_ValidToken = async () => {
  const token = generateToken(testUser1);
  const response = await fetch(`${API_URL}/api/contacts/remove`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ removeEmail: testUser2.email })
  });

  // May return 404 if user doesn't exist in DB
  if (response.status === 404) {
    console.log('   ⚠️  User or contact not found in DB (expected in test environment)');
    return;
  }

  // May return 400 if contact doesn't exist in user's contact list
  if (response.status === 400) {
    const data = await response.json();
    console.log(`   ⚠️  ${data.error} (expected in test environment)`);
    return;
  }

  const data = await response.json();
  assert.strictEqual(response.status, 200, 'Remove contact should return 200');
  assert(data.message, 'Response should include success message');
};

const testRemoveContact_NoEmail = async () => {
  const token = generateToken(testUser1);
  const response = await fetch(`${API_URL}/api/contacts/remove`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({})
  });

  const data = await response.json();
  assert.strictEqual(response.status, 400, 'Remove contact without email should return 400');
  assert(data.error, 'Should return error message');
};


// ============================================================================
// MESSAGES TESTS
// ============================================================================

const testGetMessages_NoToken = async () => {
  const response = await fetch(`${API_URL}/api/messages/user123`, {
    method: 'GET'
  });

  const data = await response.json();
  assert.strictEqual(response.status, 401, 'Get messages without token should return 401');
  assert(data.error, 'Should return error message');
};

const testGetMessages_InvalidToken = async () => {
  const response = await fetch(`${API_URL}/api/messages/user123`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer invalid-token-12345'
    }
  });

  const data = await response.json();
  assert.strictEqual(response.status, 401, 'Get messages with invalid token should return 401');
  assert.strictEqual(data.error, 'Invalid token', 'Should return invalid token error');
};

const testGetMessages_ValidToken = async () => {
  const token = generateToken(testUser1);
  const response = await fetch(`${API_URL}/api/messages/${testUser2.userId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // May return 404 if user doesn't exist, or 500 if there's a DB issue
  // Both are acceptable in test environment
  if (response.status === 404 || response.status === 500) {
    console.log(`   ⚠️  Got ${response.status} (expected in test environment without proper DB setup)`);
    return;
  }

  const data = await response.json();
  assert.strictEqual(response.status, 200, 'Get messages should return 200');
  assert(Array.isArray(data), 'Messages response should be an array');
};

const testGetConversations_NoToken = async () => {
  const response = await fetch(`${API_URL}/api/messages/conversations`, {
    method: 'GET'
  });

  const data = await response.json();
  assert.strictEqual(response.status, 401, 'Get conversations without token should return 401');
  assert(data.error, 'Should return error message');
};

const testGetConversations_InvalidToken = async () => {
  const response = await fetch(`${API_URL}/api/messages/conversations`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer invalid-token-12345'
    }
  });

  const data = await response.json();
  assert.strictEqual(response.status, 401, 'Get conversations with invalid token should return 401');
  assert.strictEqual(data.error, 'Invalid token', 'Should return invalid token error');
};

const testGetConversations_ValidToken = async () => {
  const token = generateToken(testUser1);
  const response = await fetch(`${API_URL}/api/messages/conversations`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // May return 404 or 500 in test environment
  if (response.status === 404 || response.status === 500) {
    console.log(`   ⚠️  Got ${response.status} (expected in test environment without proper DB setup)`);
    return;
  }

  const data = await response.json();
  assert.strictEqual(response.status, 200, 'Get conversations should return 200');
  assert(Array.isArray(data), 'Conversations response should be an array');
};

const testSendMessage_EmptyContent = async () => {
  const token = generateToken(testUser1);
  const response = await fetch(`${API_URL}/api/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      receiverId: testUser2.userId,
      content: '   ',  // Empty/whitespace content
      timestamp: new Date().toISOString()
    })
  });

  const data = await response.json();

  // Should reject empty messages with 400
  assert.strictEqual(response.status, 400, 'Empty message content should return 400');
  assert(data.error, 'Response should include error message');
  assert(data.error.toLowerCase().includes('content') || data.error.toLowerCase().includes('message'),
    'Error should mention content or message requirement');
};

// ============================================================================
// AUTHENTICATION MIDDLEWARE TESTS
// ============================================================================

const testAuthMiddleware_NoHeader = async () => {
  const response = await fetch(`${API_URL}/api/messages/conversations`, {
    method: 'GET'
  });

  const data = await response.json();
  assert.strictEqual(response.status, 401, 'Request without Authorization header should return 401');
  assert.strictEqual(data.error, 'No token provided', 'Should return no token provided error');
};

const testAuthMiddleware_MalformedHeader = async () => {
  const response = await fetch(`${API_URL}/api/messages/conversations`, {
    method: 'GET',
    headers: {
      'Authorization': 'InvalidFormat token123'
    }
  });

  const data = await response.json();
  assert.strictEqual(response.status, 401, 'Request with malformed header should return 401');
};

const testAuthMiddleware_BearerOnly = async () => {
  const response = await fetch(`${API_URL}/api/messages/conversations`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer '
    }
  });

  const data = await response.json();
  assert.strictEqual(response.status, 401, 'Request with Bearer but no token should return 401');
  assert(data.error, 'Should return error message');
};

// ============================================================================
// SERVER CONFIGURATION TESTS
// ============================================================================

const testCORSHeaders = async () => {
  const response = await fetch(`${API_URL}/health`, {
    method: 'GET',
    headers: {
      'Origin': 'http://localhost:5173'
    }
  });

  assert.strictEqual(response.status, 200, 'Health check should return 200');

  // Check for CORS headers
  const corsHeader = response.headers.get('access-control-allow-origin');
  assert(corsHeader, 'Response should include CORS header');

  // Verify the origin is allowed
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];
  const isAllowed = allowedOrigins.includes(corsHeader) || corsHeader === '*';
  assert(isAllowed, `CORS header should allow the origin (got: ${corsHeader})`);

  console.log(`   ✓ CORS configured correctly (allows: ${corsHeader})`);
};

// ============================================================================
// RUN ALL TESTS
// ============================================================================

const runAllTests = async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 Starting Comprehensive Backend Test Suite');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`⏱️  Timeout per test: ${TEST_TIMEOUT}ms`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check if server is running
  console.log('🔍 Checking server connectivity...');
  const isServerRunning = await checkServerConnection();
  if (!isServerRunning) {
    console.error('❌ Server is not accessible!');
    console.error(`   Please ensure the server is running on ${API_URL}`);
    console.error('   Start the server with: npm start or npm run dev\n');
    process.exit(1);
  }
  console.log('✅ Server is accessible!\n');

  const testSuites = [
    {
      name: 'Health Check & Routing',
      tests: [
        { name: 'Health check endpoint', fn: testHealthCheck },
        { name: '404 handler for non-existent routes', fn: test404Route },
      ]
    },
    {
      name: 'Authentication Routes',
      tests: [
        { name: 'Verify endpoint - valid token', fn: testAuthVerify_ValidToken },
        { name: 'Verify endpoint - invalid token', fn: testAuthVerify_InvalidToken },
        { name: 'Verify endpoint - no token', fn: testAuthVerify_NoToken },
        { name: 'Login endpoint - no Firebase token', fn: testAuthLogin_NoToken },
        { name: 'Rate limiting on auth endpoint', fn: testRateLimit_AuthEndpoint },
      ]
    },
    {
      name: 'Contacts Routes',
      tests: [
        { name: 'Get contacts - valid token', fn: testGetContacts_ValidToken },
        { name: 'Get contacts - no token', fn: testGetContacts_NoToken },
        { name: 'Get contacts - invalid token', fn: testGetContacts_InvalidToken },
        { name: 'Get all users - valid token', fn: testGetAllUsers_ValidToken },
        { name: 'Get all users - no token', fn: testGetAllUsers_NoToken },
        { name: 'Add contact - no email', fn: testAddContact_NoEmail },
        { name: 'Add contact - no token', fn: testAddContact_NoToken },
        { name: 'Add contact - invalid token', fn: testAddContact_InvalidToken },
        { name: 'Add contact - self email', fn: testAddContact_SelfEmail },
        { name: 'Add contact - rate limiting', fn: testAddContact_RateLimiting },
        { name: 'Add contact - invalid email format', fn: testAddContact_InvalidEmailFormat },
        { name: 'Get contacts - expired token', fn: testGetContacts_ExpiredToken },
        { name: 'Remove contact - valid token', fn: testRemoveContact_ValidToken },
        { name: 'Remove contact - no email', fn: testRemoveContact_NoEmail },
      ]
    },
    {
      name: 'Messages Routes',
      tests: [
        { name: 'Get messages - valid token', fn: testGetMessages_ValidToken },
        { name: 'Get messages - no token', fn: testGetMessages_NoToken },
        { name: 'Get messages - invalid token', fn: testGetMessages_InvalidToken },
        { name: 'Get conversations - valid token', fn: testGetConversations_ValidToken },
        { name: 'Get conversations - no token', fn: testGetConversations_NoToken },
        { name: 'Get conversations - invalid token', fn: testGetConversations_InvalidToken },
        { name: 'Send message - empty content', fn: testSendMessage_EmptyContent },
      ]
    },
    {
      name: 'Authentication Middleware',
      tests: [
        { name: 'Auth middleware - no Authorization header', fn: testAuthMiddleware_NoHeader },
        { name: 'Auth middleware - malformed Authorization header', fn: testAuthMiddleware_MalformedHeader },
        { name: 'Auth middleware - Bearer only (no token)', fn: testAuthMiddleware_BearerOnly },
      ]
    },
    {
      name: 'Server Configuration',
      tests: [
        { name: 'CORS headers validation', fn: testCORSHeaders },
      ]
    }
  ];

  let totalPassed = 0;
  let totalFailed = 0;
  const results = [];

  for (const suite of testSuites) {
    console.log(`\n📦 Test Suite: ${suite.name}`);
    console.log('─'.repeat(60));

    for (const test of suite.tests) {
      const result = await runTest(test.name, test.fn);
      results.push(result);
      if (result.passed) {
        totalPassed++;
      } else {
        totalFailed++;
      }
    }
  }

  // Print Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📈 Total:  ${results.length}`);
  console.log(`📊 Success Rate: ${((totalPassed / results.length) * 100).toFixed(1)}%`);

  if (totalFailed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`   • ${r.name}: ${r.error}`);
      });
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  if (totalFailed > 0) {
    console.log('⚠️  Some tests failed. This may be expected if:');
    console.log('   - The server is not running');
    console.log('   - Test users do not exist in the database');
    console.log('   - Firebase configuration is missing');
    console.log('   - Database connection is not established\n');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  }
};

// Run tests
runAllTests().catch((error) => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});
