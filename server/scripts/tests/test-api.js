const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/m365/policies/viewer?policyType=Intune',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.success && parsed.policies && parsed.policies.length > 0) {
        console.log(`\nFound ${parsed.policies.length} Intune policies\n`);

        for (const policy of parsed.policies.slice(0, 3)) {
          console.log(`📋 ${policy.policyName}`);
          console.log(`   Has mappedControls: ${!!policy.mappedControls}`);
          console.log(`   Controls count: ${policy.mappedControls ? policy.mappedControls.length : 0}`);

          if (policy.mappedControls && policy.mappedControls.length > 0) {
            console.log(`   Sample: ${policy.mappedControls.slice(0, 2).map(c => c.controlId).join(', ')}`);
          }
          console.log();
        }
      } else {
        console.log('No policies found or error:', parsed);
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.end();
