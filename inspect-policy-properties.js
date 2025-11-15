/**
 * Inspect actual property names in M365 policies
 * This helps us create better keyword mappings
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectPolicies() {
  console.log('\n📋 Inspecting M365 Policy Properties\n');
  console.log('='.repeat(70));

  // Get a sample of each policy type
  const policyTypes = ['Intune', 'AzureAD', 'Purview'];

  for (const policyType of policyTypes) {
    const policies = await prisma.m365Policy.findMany({
      where: { policyType },
      take: 3,
      select: {
        id: true,
        policyName: true,
        policyType: true,
        policyData: true,
      },
    });

    console.log(`\n📁 ${policyType} Policies (${policies.length} samples)\n`);

    for (const policy of policies) {
      console.log(`\n   Policy: ${policy.policyName}`);
      console.log(`   Type: ${policy.policyType}`);

      try {
        const data = typeof policy.policyData === 'string'
          ? JSON.parse(policy.policyData)
          : policy.policyData;

        // Get all top-level property names
        const topLevelProps = Object.keys(data);
        console.log(`   Top-level properties (${topLevelProps.length}):`);

        // Group by category
        const settingProps = topLevelProps.filter(p =>
          !p.startsWith('@') &&
          !['id', 'displayName', 'description', 'createdDateTime', 'lastModifiedDateTime'].includes(p)
        );

        // Show first 20 setting properties
        const propsToShow = settingProps.slice(0, 20);
        propsToShow.forEach(prop => {
          const value = data[prop];
          const valueStr = typeof value === 'object'
            ? `{object with ${Object.keys(value || {}).length} keys}`
            : typeof value === 'boolean'
            ? `${value}`
            : typeof value === 'number'
            ? `${value}`
            : `"${String(value).substring(0, 30)}${String(value).length > 30 ? '...' : ''}"`;
          console.log(`      • ${prop}: ${valueStr}`);
        });

        if (settingProps.length > 20) {
          console.log(`      ... and ${settingProps.length - 20} more properties`);
        }

        // Look for specific interesting properties
        const interestingKeywords = [
          'password', 'encrypt', 'bitlocker', 'firewall', 'antivirus',
          'defender', 'update', 'compliance', 'mfa', 'authentication',
          'audit', 'log', 'wireless', 'wifi', 'vpn', 'device'
        ];

        const matchingProps = settingProps.filter(prop =>
          interestingKeywords.some(keyword => prop.toLowerCase().includes(keyword))
        );

        if (matchingProps.length > 0) {
          console.log(`   🔍 Properties matching security keywords:`);
          matchingProps.forEach(prop => {
            console.log(`      🎯 ${prop}`);
          });
        }

      } catch (error) {
        console.log(`   ❌ Error parsing policy data:`, error.message);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Inspection complete!\n');

  await prisma.$disconnect();
}

inspectPolicies().catch(console.error);
