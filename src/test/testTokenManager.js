// Test script to verify TokenManager functionality
// Run this in the browser console to test token management

async function testTokenManager() {
  console.log('🧪 Testing Token Manager...\n');

  try {
    // Test 1: Check if token can be retrieved
    console.log('Test 1: Retrieving token...');
    const token = await window.tokenManager?.getToken();
    if (token) {
      console.log('✅ Token retrieved successfully');
      console.log(`   Token preview: ${token.substring(0, 30)}...`);
    } else {
      console.log('⚠️ No token found (user may need to login)');
    }

    // Test 2: Check sync token retrieval
    console.log('\nTest 2: Retrieving token synchronously...');
    const syncToken = window.tokenManager?.getTokenSync();
    if (syncToken) {
      console.log('✅ Sync token retrieved successfully');
      console.log(`   Matches async token: ${syncToken === token}`);
    } else {
      console.log('⚠️ No sync token found');
    }

    // Test 3: Check auth headers
    console.log('\nTest 3: Getting auth headers...');
    const headers = await window.tokenManager?.getAuthHeaders();
    console.log('✅ Auth headers:', headers);

    // Test 4: Check if old auth_token is cleared
    console.log('\nTest 4: Checking for old auth_token...');
    const oldToken = localStorage.getItem('auth_token');
    if (oldToken) {
      console.log('⚠️ Old auth_token still exists in localStorage');
    } else {
      console.log('✅ Old auth_token has been cleared');
    }

    // Test 5: Check Cognito tokens
    console.log('\nTest 5: Checking Cognito tokens...');
    const cognitoKeys = Object.keys(localStorage).filter(key =>
      key.includes('CognitoIdentityServiceProvider')
    );
    console.log(`✅ Found ${cognitoKeys.length} Cognito keys`);
    cognitoKeys.forEach((key, i) => {
      const keyType = key.split('.').pop();
      console.log(`   ${i + 1}. ${keyType}`);
    });

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Auto-run if tokenManager is available
if (typeof window !== 'undefined') {
  // Try to import and expose tokenManager globally for testing
  import('@/lib/auth/tokenManager').then(module => {
    window.tokenManager = module.tokenManager;
    console.log('TokenManager loaded. Run testTokenManager() to test.');
  }).catch(err => {
    console.log('Could not load TokenManager:', err);
    console.log('Testing with direct localStorage access...');
    testTokenManager();
  });
}

// Export for use
window.testTokenManager = testTokenManager;