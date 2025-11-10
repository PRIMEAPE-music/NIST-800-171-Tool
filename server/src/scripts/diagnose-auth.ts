import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function diagnose() {
  console.log('🔍 Diagnosing Authentication Issues...\n');

  // Check 1: Environment variables
  console.log('1. Environment Variables:');
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  console.log(`   AZURE_TENANT_ID: ${tenantId ? '✅ ' + tenantId : '❌ MISSING'}`);
  console.log(`   AZURE_CLIENT_ID: ${clientId ? '✅ ' + clientId : '❌ MISSING'}`);
  console.log(`   AZURE_CLIENT_SECRET: ${clientSecret ? '✅ SET (length: ' + clientSecret.length + ')' : '❌ MISSING'}`);

  if (!tenantId || !clientId || !clientSecret) {
    console.log('\n❌ Missing required environment variables!');
    console.log('   Please check your server/.env file\n');
    return;
  }

  // Check 2: Try to authenticate
  console.log('\n2. Testing Authentication:');
  try {
    const { authService } = await import('../services/auth.service');
    console.log('   Attempting to acquire token...');
    const isValid = await authService.validateConnection();
    
    if (isValid) {
      console.log('   ✅ Authentication successful!');
    } else {
      console.log('   ❌ Authentication failed (returned false)');
    }
  } catch (error: any) {
    console.log('   ❌ Authentication error:');
    console.log('   Error type:', error.name);
    console.log('   Error message:', error.message);
    
    if (error.errorCode) {
      console.log('   Error code:', error.errorCode);
    }
    
    if (error.message.includes('invalid_client')) {
      console.log('\n💡 Solution: The client secret is wrong or the client ID is wrong.');
      console.log('   Go to Azure Portal and regenerate the client secret.');
    }
    
    if (error.message.includes('AADSTS700016')) {
      console.log('\n💡 Solution: The Application (client) ID is wrong.');
      console.log('   Verify the client ID in Azure Portal matches your .env file.');
    }
    
    if (error.message.includes('AADSTS90002')) {
      console.log('\n💡 Solution: The Tenant ID is wrong.');
      console.log('   Verify the tenant ID in Azure Portal matches your .env file.');
    }
  }

  console.log('\n✅ Diagnosis complete\n');
  process.exit(0);
}

diagnose().catch(console.error);