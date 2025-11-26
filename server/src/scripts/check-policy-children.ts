/**
 * Check for Child Settings in BitLocker Policy
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPolicyChildren() {
  console.log('\n' + '='.repeat(80));
  console.log('CHECKING FOR CHILD SETTINGS IN BITLOCKER POLICY');
  console.log('='.repeat(80) + '\n');

  const policy = await prisma.m365Policy.findFirst({
    where: { policyName: { contains: 'BitLocker' } },
  });

  if (!policy) {
    console.log('No BitLocker policy found');
    await prisma.$disconnect();
    return;
  }

  const policyData = JSON.parse(policy.policyData);

  console.log(`Policy: ${policy.policyName}`);
  console.log(`Policy Type: ${policyData['@odata.type']}`);
  console.log(`Total settings: ${policyData.settings?.length || 0}\n`);

  let settingsWithChildren = 0;
  let totalChildren = 0;

  if (policyData.settings) {
    policyData.settings.forEach((setting: any, i: number) => {
      const defId = setting.settingInstance?.settingDefinitionId;

      console.log(`\n[${i}] ${defId}`);

      // Check for children in different locations
      let children: any[] = [];

      if (setting.settingInstance?.choiceSettingValue?.children) {
        children = setting.settingInstance.choiceSettingValue.children;
        console.log(`  ✅ Has ${children.length} children in choiceSettingValue`);
      } else if (setting.settingInstance?.groupSettingCollectionValue) {
        children = setting.settingInstance.groupSettingCollectionValue;
        console.log(`  ✅ Has ${children.length} items in groupSettingCollectionValue`);
      } else if (setting.settingInstance?.simpleSettingValue) {
        console.log(`  ℹ️  Simple value (no children expected)`);
      } else {
        console.log(`  ❌ No children found`);
      }

      if (children.length > 0) {
        settingsWithChildren++;
        totalChildren += children.length;

        // Show details of first few children
        children.slice(0, 3).forEach((child: any, j: number) => {
          const childDefId = child.settingDefinitionId || child.settingInstance?.settingDefinitionId;
          let childValue = null;

          if (child.choiceSettingValue) {
            childValue = child.choiceSettingValue.value;
          } else if (child.settingInstance?.choiceSettingValue) {
            childValue = child.settingInstance.choiceSettingValue.value;
          } else if (child.simpleSettingValue) {
            childValue = child.simpleSettingValue.value;
          } else if (child.settingInstance?.simpleSettingValue) {
            childValue = child.settingInstance.simpleSettingValue.value;
          }

          console.log(`     [${j}] Child: ${childDefId}`);
          console.log(`         Value: ${childValue}`);
        });

        if (children.length > 3) {
          console.log(`     ... and ${children.length - 3} more children`);
        }
      }
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Settings with children: ${settingsWithChildren}`);
  console.log(`Total child settings: ${totalChildren}`);
  console.log('='.repeat(80) + '\n');

  if (totalChildren === 0) {
    console.log('⚠️  No child settings found!');
    console.log('\nPossible reasons:');
    console.log('1. This policy type stores settings flat (no hierarchical structure)');
    console.log('2. Graph API response did not include children');
    console.log('3. Policy was synced before children were implemented\n');
    console.log('💡 Try re-syncing the policy from Microsoft to get latest data:\n');
    console.log('   - Go to Policy Settings page');
    console.log('   - Click "Sync from Microsoft"');
    console.log('   - This will re-fetch the policy with full details\n');
  }

  await prisma.$disconnect();
}

checkPolicyChildren().catch(console.error);
