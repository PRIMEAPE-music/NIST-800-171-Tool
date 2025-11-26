/**
 * List All Child Settings in BitLocker Policy
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAllChildSettings() {
  console.log('\n' + '='.repeat(80));
  console.log('ALL CHILD SETTINGS IN BITLOCKER POLICY');
  console.log('='.repeat(80) + '\n');

  const policy = await prisma.m365Policy.findFirst({
    where: { policyName: { contains: 'BitLocker' } },
  });

  if (!policy) {
    console.log('❌ No BitLocker policy found');
    await prisma.$disconnect();
    return;
  }

  const policyData = JSON.parse(policy.policyData);
  const children = policyData.flattenedSettings.filter((s: any) => s.parentId);

  console.log(`Found ${children.length} child settings:\n`);

  children.forEach((s: any, i: number) => {
    const shortId = s.settingDefinitionId.split('_').slice(-3).join('_');
    console.log(`[${i}] ${shortId}`);
    console.log(`    Full ID: ${s.settingDefinitionId}`);
    console.log(`    Value: ${s.value}`);
    console.log(`    Type: ${s.type}`);
    console.log(`    Parent: ${s.parentId.split('_').slice(-2).join('_')}`);
    console.log('');
  });

  await prisma.$disconnect();
}

listAllChildSettings();
