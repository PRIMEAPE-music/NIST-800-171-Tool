const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSettings() {
  const policies = await prisma.m365Policy.findMany({
    select: {
      id: true,
      policyName: true,
      policyType: true,
      policyData: true,
    },
  });

  console.log(`\n📊 Analyzing ${policies.length} policies...\n`);

  let withSettings = 0;
  let withoutSettings = 0;

  policies.forEach(policy => {
    const data = JSON.parse(policy.policyData);
    const hasRootSettings = Object.keys(data).some(k =>
      k !== 'id' && k !== 'displayName' && k !== 'name' &&
      k !== 'description' && k !== 'createdDateTime' &&
      k !== 'lastModifiedDateTime' && k !== '@odata.type'
    );
    const hasNestedSettings = Array.isArray(data.settings) && data.settings.length > 0;

    if (hasRootSettings || hasNestedSettings) {
      withSettings++;
      console.log(`✅ ${policy.policyName}`);
      if (hasNestedSettings) {
        console.log(`   └─ Has ${data.settings.length} nested settings`);
      }
    } else {
      withoutSettings++;
      console.log(`❌ ${policy.policyName} - No settings found`);
    }
  });

  console.log(`\n📈 Summary:`);
  console.log(`   ✅ Policies WITH settings: ${withSettings}/${policies.length}`);
  console.log(`   ❌ Policies WITHOUT settings: ${withoutSettings}/${policies.length}`);

  await prisma.$disconnect();
}

checkSettings().catch(console.error);
