const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:' + path.join(__dirname, 'server', 'database', 'compliance.db')
    }
  }
});

async function checkPolicyCompliance() {
  try {
    console.log('Investigating policy compliance data...\n');

    // Get all policies
    const policies = await prisma.m365Policy.findMany({
      select: { id: true, policyName: true, policyType: true },
      take: 5
    });

    console.log(`Found ${policies.length} policies (showing first 5):\n`);

    // For each policy, check how many compliance checks exist
    for (const policy of policies) {
      const complianceChecks = await prisma.settingComplianceCheck.findMany({
        where: { policyId: policy.id },
      });

      console.log(`Policy ID ${policy.id}: ${policy.policyName}`);
      console.log(`  Type: ${policy.policyType}`);
      console.log(`  Compliance checks: ${complianceChecks.length}`);

      if (complianceChecks.length > 0) {
        const compliant = complianceChecks.filter(c => c.isCompliant).length;
        const nonCompliant = complianceChecks.filter(c => !c.isCompliant).length;
        const withActualValue = complianceChecks.filter(c => c.actualValue && c.actualValue !== 'null').length;

        console.log(`  Compliant: ${compliant} | Non-compliant: ${nonCompliant}`);
        console.log(`  Settings with actual values: ${withActualValue}`);
      }
      console.log('');
    }

    // Check if all compliance checks have the same policyId
    const distinctPolicyIds = await prisma.settingComplianceCheck.findMany({
      select: { policyId: true },
      distinct: ['policyId']
    });

    console.log(`\nDistinct policy IDs in compliance checks: ${distinctPolicyIds.length}`);
    console.log('Policy IDs:', distinctPolicyIds.map(p => p.policyId).join(', '));

    // Check total compliance checks
    const totalChecks = await prisma.settingComplianceCheck.count();
    console.log(`\nTotal compliance checks in database: ${totalChecks}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPolicyCompliance();
