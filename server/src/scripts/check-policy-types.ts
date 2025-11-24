/**
 * Check Policy Types
 * Shows what policy templates exist in the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPolicyTypes() {
  const policies = await prisma.m365Policy.findMany({
    select: {
      id: true,
      policyName: true,
      odataType: true,
      policyType: true
    }
  });

  console.log('\nPolicy Templates Summary:\n');

  const templateCounts = new Map<string, number>();
  for (const p of policies) {
    const template = p.odataType || 'NULL';
    templateCounts.set(template, (templateCounts.get(template) || 0) + 1);
  }

  const sortedTemplates = Array.from(templateCounts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [template, count] of sortedTemplates) {
    console.log(`${count.toString().padStart(2)} - ${template}`);
  }

  console.log('\n\nSettings Catalog Policies:\n');
  const catalogPolicies = policies.filter(p =>
    p.odataType?.includes('settingsCatalog')
  );

  if (catalogPolicies.length === 0) {
    console.log('  (None found)');
  } else {
    for (const p of catalogPolicies) {
      console.log(`  ${p.policyName}`);
      console.log(`    Type: ${p.odataType}`);
      console.log('');
    }
  }

  console.log('\nWindows Custom Configuration Policies:\n');
  const customPolicies = policies.filter(p =>
    p.odataType?.includes('windows10CustomConfiguration')
  );

  if (customPolicies.length === 0) {
    console.log('  (None found)');
  } else {
    for (const p of customPolicies) {
      console.log(`  ${p.policyName}`);
      console.log(`    Type: ${p.odataType}`);
      console.log('');
    }
  }

  await prisma.$disconnect();
}

checkPolicyTypes().catch(console.error);
