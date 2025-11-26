/**
 * Check if Policy Has Flattened Settings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPolicyHasFlattened() {
  console.log('\n' + '='.repeat(80));
  console.log('CHECK IF BITLOCKER POLICY HAS FLATTENED SETTINGS');
  console.log('='.repeat(80) + '\n');

  const policy = await prisma.m365Policy.findFirst({
    where: { policyName: { contains: 'BitLocker' } },
  });

  if (!policy) {
    console.log('❌ No BitLocker policy found');
    await prisma.$disconnect();
    return;
  }

  console.log(`Policy: ${policy.policyName}`);
  console.log(`Last synced: ${policy.lastSynced}\n`);

  const policyData = JSON.parse(policy.policyData);

  console.log('Policy data structure:');
  console.log(`  Has settings: ${!!policyData.settings}`);
  console.log(`  settings.length: ${policyData.settings?.length || 0}`);
  console.log(`  Has flattenedSettings: ${!!policyData.flattenedSettings}`);
  console.log(`  flattenedSettings.length: ${policyData.flattenedSettings?.length || 0}`);
  console.log(`  Has settingsCount: ${!!policyData.settingsCount}`);
  console.log(`  settingsCount: ${policyData.settingsCount || 'N/A'}\n`);

  if (policyData.flattenedSettings) {
    console.log('✅ Policy HAS flattenedSettings!');
    console.log('\nSample flattened settings (first 5):');
    policyData.flattenedSettings.slice(0, 5).forEach((s: any, i: number) => {
      console.log(`[${i}] ${s.settingDefinitionId}`);
      console.log(`    Value: ${s.value}`);
      console.log(`    Type: ${s.type}`);
      console.log(`    Depth: ${s.depth}`);
      console.log(`    ParentId: ${s.parentId || '(root)'}`);
    });

    // Count children
    const children = policyData.flattenedSettings.filter((s: any) => s.parentId);
    console.log(`\nTotal: ${policyData.flattenedSettings.length} settings`);
    console.log(`Children: ${children.length}`);
    console.log(`Root: ${policyData.flattenedSettings.length - children.length}`);
  } else {
    console.log('❌ Policy does NOT have flattenedSettings');
    console.log('You need to re-sync the policy from Microsoft to get the flattened data');
  }

  console.log('\n');
  await prisma.$disconnect();
}

checkPolicyHasFlattened();
