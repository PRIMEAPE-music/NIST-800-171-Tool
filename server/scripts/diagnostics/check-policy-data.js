const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPolicyData() {
  // Get a policy that shows "Unknown" in displayName or has minimal settings
  const policies = await prisma.m365Policy.findMany({
    select: {
      id: true,
      policyId: true,
      policyName: true,
      policyType: true,
      policyData: true,
    },
    take: 5,
  });

  console.log(`\n📊 Checking policy data structure...\n`);

  for (const policy of policies) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Policy: ${policy.policyName}`);
    console.log(`Type: ${policy.policyType}`);
    console.log(`Policy ID: ${policy.policyId}`);

    const data = JSON.parse(policy.policyData);

    console.log(`\nKeys in policyData:`);
    console.log(Object.keys(data).join(', '));

    // Check for different settings structures
    if (data.settings) {
      console.log(`\n✓ Has 'settings' field:`);
      if (Array.isArray(data.settings)) {
        console.log(`  - settings is an ARRAY with ${data.settings.length} items`);
        if (data.settings.length > 0) {
          console.log(`  - First setting keys:`, Object.keys(data.settings[0]).join(', '));
        }
      } else if (typeof data.settings === 'object') {
        console.log(`  - settings is an OBJECT with keys:`, Object.keys(data.settings).join(', '));
        for (const [key, value] of Object.entries(data.settings)) {
          if (Array.isArray(value)) {
            console.log(`    - ${key}: array with ${value.length} items`);
          } else {
            console.log(`    - ${key}: ${typeof value}`);
          }
        }
      }
    }

    // Check displayName
    if (data.displayName) {
      console.log(`\ndisplayName in policyData: "${data.displayName}"`);
    }

    // Count total meaningful keys (excluding metadata)
    const meaningfulKeys = Object.keys(data).filter(k =>
      k !== 'id' &&
      k !== '@odata.type' &&
      k !== '@odata.context' &&
      k !== 'displayName' &&
      k !== 'name' &&
      k !== 'description' &&
      k !== 'createdDateTime' &&
      k !== 'lastModifiedDateTime' &&
      k !== 'modifiedDateTime'
    );

    console.log(`\nMeaningful keys (${meaningfulKeys.length}):`, meaningfulKeys.join(', '));
  }

  await prisma.$disconnect();
}

checkPolicyData().catch(console.error);
