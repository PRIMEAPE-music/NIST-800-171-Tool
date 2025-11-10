import dotenv from 'dotenv';
dotenv.config();

import { authService } from '../services/auth.service';
import { graphClientService } from '../services/graphClient.service';

async function testAuthentication() {
  console.log('🔐 Testing M365 Authentication...\n');

  try {
    // Test 1: Validate connection
    console.log('Test 1: Validating connection...');
    const isConnected = await authService.validateConnection();
    console.log(`Result: ${isConnected ? '✅ Connected' : '❌ Failed'}\n`);

    if (!isConnected) {
      throw new Error('Connection validation failed');
    }

    // Test 2: Acquire token
    console.log('Test 2: Acquiring access token...');
    const token = await authService.acquireToken();
    console.log(`Result: ✅ Token acquired (length: ${token.length})\n`);

    // Test 3: Test Graph API
    console.log('Test 3: Testing Graph API connection...');
    const graphConnected = await graphClientService.testConnection();
    console.log(`Result: ${graphConnected ? '✅ Graph API accessible' : '❌ Graph API failed'}\n`);

    // Test 4: Get organization info
    console.log('Test 4: Fetching organization info...');
    const orgInfo = await graphClientService.get('/organization');
    console.log('Result: ✅ Organization data retrieved');
    console.log('Organization:', JSON.stringify(orgInfo, null, 2));

    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testAuthentication();
