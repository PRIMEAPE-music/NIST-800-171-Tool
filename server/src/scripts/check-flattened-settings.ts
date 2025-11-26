/**
 * Check Flattened Settings in Database
 *
 * Verifies if flattenedSettings array was saved during sync
 * and inspects the structure of child settings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFlattenedSettings() {
  console.log('\n' + '='.repeat(80));
  console.log('CHECK FLATTENED SETTINGS IN DATABASE');
  console.log('='.repeat(80) + '\n');

  try {
    // Get BitLocker policy
    const policy = await prisma.m365Policy.findFirst({
      where: { policyName: { contains: 'BitLocker' } },
    });

    if (!policy) {
      console.log('❌ No BitLocker policy found in database');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found policy: ${policy.policyName}`);
    console.log(`Policy ID: ${policy.policyId}\n`);

    const policyData = JSON.parse(policy.policyData);

    console.log('='.repeat(80));
    console.log('POLICY DATA STRUCTURE');
    console.log('='.repeat(80));
    console.log(`Has 'settings' property: ${!!policyData.settings}`);
    console.log(`Settings count: ${policyData.settings?.length || 0}`);
    console.log(`Has 'flattenedSettings' property: ${!!policyData.flattenedSettings}`);
    console.log(`Flattened settings count: ${policyData.flattenedSettings?.length || 0}`);
    console.log(`Has 'settingsCount' property: ${!!policyData.settingsCount}`);
    console.log(`Settings count value: ${policyData.settingsCount || 'N/A'}\n`);

    if (policyData.flattenedSettings && policyData.flattenedSettings.length > 0) {
      console.log('✅ Flattened settings WERE saved to database!\n');

      const topLevel = policyData.flattenedSettings.filter((s: any) => !s.parentId);
      const children = policyData.flattenedSettings.filter((s: any) => s.parentId);

      console.log('='.repeat(80));
      console.log('SUMMARY');
      console.log('='.repeat(80));
      console.log(`Total flattened settings: ${policyData.flattenedSettings.length}`);
      console.log(`Top-level settings: ${topLevel.length}`);
      console.log(`Child settings: ${children.length}`);
      console.log('='.repeat(80) + '\n');

      console.log('FLATTENED SETTINGS LIST (with hierarchy):\n');

      // Group children by parent
      const childrenByParent = new Map<string, any[]>();
      for (const child of children) {
        if (!childrenByParent.has(child.parentId)) {
          childrenByParent.set(child.parentId, []);
        }
        childrenByParent.get(child.parentId)!.push(child);
      }

      // Display top-level settings with their children
      topLevel.forEach((setting: any, i: number) => {
        const shortId = setting.settingDefinitionId.split('_').slice(-2).join('_');
        console.log(`[${i}] ${shortId}`);
        console.log(`    Full ID: ${setting.settingDefinitionId}`);
        console.log(`    Value: ${setting.value}`);
        console.log(`    Type: ${setting.type}`);
        console.log(`    Depth: ${setting.depth}`);

        // Show children
        const childSettings = childrenByParent.get(setting.settingDefinitionId);
        if (childSettings && childSettings.length > 0) {
          console.log(`    ✅ Has ${childSettings.length} children:`);
          childSettings.forEach((child: any, j: number) => {
            const childShortId = child.settingDefinitionId.split('_').slice(-2).join('_');
            console.log(`       [${j}] ${childShortId}`);
            console.log(`           Full ID: ${child.settingDefinitionId}`);
            console.log(`           Value: ${child.value}`);
            console.log(`           Type: ${child.type}`);
            console.log(`           Depth: ${child.depth}`);
          });
        }
        console.log('');
      });

      // Check for specific detailed settings
      console.log('='.repeat(80));
      console.log('LOOKING FOR DETAILED CONFIGURATION VALUES');
      console.log('='.repeat(80) + '\n');

      const encryptionMethodSettings = policyData.flattenedSettings.filter(
        (s: any) =>
          s.settingDefinitionId.toLowerCase().includes('encryptionmethod') ||
          s.settingDefinitionId.toLowerCase().includes('encryptiontype') ||
          s.settingDefinitionId.toLowerCase().includes('xts') ||
          s.settingDefinitionId.toLowerCase().includes('aes')
      );

      const pinSettings = policyData.flattenedSettings.filter(
        (s: any) =>
          s.settingDefinitionId.toLowerCase().includes('pin') ||
          s.settingDefinitionId.toLowerCase().includes('minlength')
      );

      console.log(`Found ${encryptionMethodSettings.length} encryption method settings:`);
      encryptionMethodSettings.forEach((s: any) => {
        console.log(`  - ${s.settingDefinitionId}`);
        console.log(`    Value: ${s.value}`);
      });

      console.log(`\nFound ${pinSettings.length} PIN-related settings:`);
      pinSettings.forEach((s: any) => {
        console.log(`  - ${s.settingDefinitionId}`);
        console.log(`    Value: ${s.value}`);
      });

      if (encryptionMethodSettings.length === 0 && pinSettings.length === 0) {
        console.log('\n⚠️  No detailed configuration values found in child settings');
        console.log('The child settings may be using IDs that don\'t contain obvious keywords\n');
      }
    } else {
      console.log('❌ Flattened settings NOT found in database!\n');
      console.log('This means the sync service is not saving flattenedSettings to policyData.');
      console.log('The enhancement may not be working correctly.\n');

      console.log('Original settings structure:');
      if (policyData.settings) {
        policyData.settings.slice(0, 3).forEach((setting: any, i: number) => {
          console.log(`\n[${i}] ${setting.settingInstance?.settingDefinitionId}`);
          console.log(`    Type: ${setting['@odata.type']}`);
          console.log(`    Has children in choiceSettingValue: ${!!setting.settingInstance?.choiceSettingValue?.children}`);
          console.log(
            `    Children count: ${setting.settingInstance?.choiceSettingValue?.children?.length || 0}`
          );
        });
      }
    }

    // Check current mappings count
    console.log('\n' + '='.repeat(80));
    console.log('CURRENT MAPPING STATUS');
    console.log('='.repeat(80) + '\n');

    const mappings = await prisma.controlSettingMapping.findMany({
      where: { m365Setting: { m365Policies: { some: { policyId: policy.id } } } },
      include: { m365Setting: true },
    });

    console.log(`Settings mapped to this policy: ${mappings.length}`);
    console.log('\nMapped settings:');
    mappings.forEach((m, i) => {
      console.log(`  [${i}] ${m.m365Setting.displayName}`);
      console.log(`      Setting Name: ${m.m365Setting.settingName}`);
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkFlattenedSettings();
