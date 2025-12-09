const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const policy = await prisma.m365Policy.findFirst({
    where: {
      policyData: {
        contains: 'settingInstance'
      }
    }
  });

  if (policy) {
    console.log(`\nPolicy: ${policy.policyName}\n`);
    const data = JSON.parse(policy.policyData);

    if (data.settings && data.settings.length > 0) {
      console.log('First 2 settings structure:');
      console.log(JSON.stringify(data.settings.slice(0, 2), null, 2));
    }
  }

  await prisma.$disconnect();
})();
