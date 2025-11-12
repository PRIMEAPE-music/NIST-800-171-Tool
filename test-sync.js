// Simple test script - run with: node test-sync.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/m365/sync',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log('\n🔄 Triggering M365 Sync...\n');
console.log('Watch your server console for detailed output!\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response:', JSON.parse(data));
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
  console.log('\nMake sure your server is running on port 3001!');
});

req.write('{"forceRefresh": true}');
req.end();
