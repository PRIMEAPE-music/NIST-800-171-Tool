import dotenv from 'dotenv';
import path from 'path';

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('=== Environment Variables Check ===\n');
console.log('AZURE_TENANT_ID:', process.env.AZURE_TENANT_ID ? '✅ SET (' + process.env.AZURE_TENANT_ID + ')' : '❌ MISSING');
console.log('AZURE_CLIENT_ID:', process.env.AZURE_CLIENT_ID ? '✅ SET (' + process.env.AZURE_CLIENT_ID + ')' : '❌ MISSING');
console.log('AZURE_CLIENT_SECRET:', process.env.AZURE_CLIENT_SECRET ? '✅ SET (length: ' + process.env.AZURE_CLIENT_SECRET.length + ' chars)' : '❌ MISSING');
console.log('First 10 chars of secret:', process.env.AZURE_CLIENT_SECRET?.substring(0, 10) || '❌ NONE');
console.log('\n');