const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const mappings = await prisma.controlPolicyMapping.findMany({
    include: {
      policy: { select: { policyName: true, policyType: true } },
      control: { select: { controlId: true, title: true } }
    }
  });

  console.log(`\n📊 Total Mappings: ${mappings.length}\n`);

  const byType = mappings.reduce((acc, m) => {
    acc[m.policy.policyType] = (acc[m.policy.policyType] || 0) + 1;
    return acc;
  }, {});

  console.log('By Policy Type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });

  const byConfidence = mappings.reduce((acc, m) => {
    acc[m.mappingConfidence] = (acc[m.mappingConfidence] || 0) + 1;
    return acc;
  }, {});

  console.log('\nBy Confidence Level:');
  Object.entries(byConfidence).forEach(([level, count]) => {
    console.log(`   ${level}: ${count}`);
  });

  const uniqueControls = new Set(mappings.map(m => m.control.controlId)).size;
  const uniquePolicies = new Set(mappings.map(m => m.policy.policyName)).size;

  console.log(`\n📈 Coverage:`);
  console.log(`   Unique Controls Mapped: ${uniqueControls}`);
  console.log(`   Unique Policies Mapped: ${uniquePolicies}`);

  await prisma.$disconnect();
})();
