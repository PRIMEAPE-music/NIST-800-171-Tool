/**
 * Analyze Settings Catalog Policy Structures
 *
 * Examines how Settings Catalog policies store their values
 * to improve extraction strategies
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeSettingsCatalog() {
  console.log('\n=== SETTINGS CATALOG STRUCTURE ANALYSIS ===\n');

  // Get all Settings Catalog policies
  const policies = await prisma.m365Policy.findMany({
    where: {
      odataType: { startsWith: '#settingsCatalog' }
    }
  });

  console.log(`Found ${policies.length} Settings Catalog policies\n`);

  // Group by template type
  const byType: Record<string, any[]> = {};

  for (const policy of policies) {
    const type = policy.odataType || 'unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(policy);
  }

  // Analyze each type
  for (const [type, typePolicies] of Object.entries(byType)) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TYPE: ${type}`);
    console.log(`Policies: ${typePolicies.length}`);
    console.log(`${'='.repeat(70)}`);

    // Analyze first policy of this type
    const policy = typePolicies[0];
    const data = JSON.parse(policy.policyData);

    console.log(`\nPolicy: ${policy.policyName}`);
    console.log(`Top-level keys: ${Object.keys(data).join(', ')}`);

    // Check for settings array
    if (data.settings && Array.isArray(data.settings)) {
      console.log(`\n--- settings array (${data.settings.length} items) ---`);

      if (data.settings.length > 0) {
        const firstSetting = data.settings[0];
        console.log('\nFirst setting structure:');
        console.log(JSON.stringify(firstSetting, null, 2));

        // Find common patterns
        console.log('\nSetting patterns found:');
        const patterns = new Set<string>();

        for (const setting of data.settings.slice(0, 10)) {
          if (setting.settingInstance) {
            const instance = setting.settingInstance;
            const definitionId = instance.settingDefinitionId || '';
            const valueType = Object.keys(instance).find(k => k.includes('Value') || k.includes('value'));
            patterns.add(`${instance['@odata.type']} -> ${valueType}`);

            // Extract the setting name from definitionId
            const parts = definitionId.split('_');
            const settingName = parts[parts.length - 1];

            // Get the actual value
            let actualValue = 'N/A';
            if (instance.choiceSettingValue) {
              actualValue = instance.choiceSettingValue.value;
            } else if (instance.simpleSettingValue) {
              actualValue = instance.simpleSettingValue.value;
            } else if (instance.groupSettingCollectionValue) {
              actualValue = '[GroupCollection]';
            }

            console.log(`  - ${settingName}: ${actualValue}`);
          }
        }

        console.log('\nValue type patterns:');
        patterns.forEach(p => console.log(`  ${p}`));
      }
    }

    // Check for settingsDelta (older format)
    if (data.settingsDelta && Array.isArray(data.settingsDelta)) {
      console.log(`\n--- settingsDelta array (${data.settingsDelta.length} items) ---`);
      if (data.settingsDelta.length > 0) {
        console.log('\nFirst delta item:');
        console.log(JSON.stringify(data.settingsDelta[0], null, 2));
      }
    }
  }

  // Summary of value extraction paths
  console.log('\n\n' + '='.repeat(70));
  console.log('EXTRACTION PATH SUMMARY');
  console.log('='.repeat(70));
  console.log(`
For Settings Catalog policies, values are stored in:

1. settings[].settingInstance.settingDefinitionId - Contains the setting identifier
2. settings[].settingInstance.choiceSettingValue.value - For choice/enum values
3. settings[].settingInstance.simpleSettingValue.value - For simple values (bool, int, string)
4. settings[].settingInstance.groupSettingCollectionValue - For complex grouped settings

To extract a value:
1. Search settings[] array
2. Match settingDefinitionId (contains keywords like the setting name)
3. Check which *Value property exists
4. Extract the .value from that property
`);

  await prisma.$disconnect();
}

analyzeSettingsCatalog().catch(console.error);
