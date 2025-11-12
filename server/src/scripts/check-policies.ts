import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPolicies() {
  const policies = await prisma.m365Policy.findMany();

  console.log('\nSynced M365 Policies:\n');
  policies.forEach(p => {
    console.log(`- [${p.policyType}] ${p.policyName}`);
    if (p.policyDescription) {
      console.log(`  Description: ${p.policyDescription.substring(0, 100)}${p.policyDescription.length > 100 ? '...' : ''}`);
    }
  });

  await prisma.$disconnect();
}

checkPolicies();
