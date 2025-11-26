/**
 * Suggest Child Setting Mappings
 *
 * Identifies settings that are extracting parent values (like "true" = enabled)
 * when they should be extracting child settings with more specific values
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Suggestion {
  setting: any;
  policy: any;
  currentValue: string;
  possibleChildren: Array<{ id: string; value: string; displayValue?: string }>;
}

async function suggestChildSettingMappings() {
  console.log('\n' + '='.repeat(80));
  console.log('SUGGEST CHILD SETTING MAPPINGS');
  console.log('='.repeat(80) + '\n');

  const suggestions: Suggestion[] = [];

  // Get all policies with flattened settings
  const policies = await prisma.m365Policy.findMany({
    where: {
      policyData: { contains: 'flattenedSettings' },
    },
  });

  console.log(`Analyzing ${policies.length} policies with flattened settings...\n`);

  for (const policy of policies) {
    const policyData = JSON.parse(policy.policyData);
    const flattenedSettings = policyData.flattenedSettings || [];

    if (flattenedSettings.length === 0) continue;

    // Get compliance checks for this policy
    const checks = await prisma.settingComplianceCheck.findMany({
      where: {
        policyId: policy.id,
        actualValue: { not: null },
      },
      include: {
        setting: true,
      },
    });

    for (const check of checks) {
      const actualValue = check.actualValue;

      // Skip if already extracting a complex value
      if (actualValue && actualValue.length > 50) continue;

      // Check if this is likely a parent setting (returns simple true/false/"enabled")
      const isProbablyParent =
        actualValue === 'true' ||
        actualValue === 'false' ||
        actualValue === '"Enabled"' ||
        actualValue === '"Disabled"' ||
        actualValue === '"True"' ||
        actualValue === '"False"';

      if (!isProbablyParent) continue;

      // Find the setting in flattened settings
      const settingInPolicy = flattenedSettings.find(
        (s: any) =>
          s.settingDefinitionId.toLowerCase() === check.setting.settingName.toLowerCase()
      );

      if (!settingInPolicy) continue;

      // Look for child settings
      const children = flattenedSettings.filter(
        (s: any) => s.parentId === settingInPolicy.settingDefinitionId
      );

      if (children.length > 0) {
        suggestions.push({
          setting: check.setting,
          policy,
          currentValue: actualValue,
          possibleChildren: children.map((child: any) => ({
            id: child.settingDefinitionId,
            value: child.value,
          })),
        });
      }
    }
  }

  // Display suggestions
  console.log('='.repeat(80));
  console.log(`FOUND ${suggestions.length} SETTINGS THAT MIGHT BENEFIT FROM CHILD MAPPING`);
  console.log('='.repeat(80) + '\n');

  suggestions.forEach((suggestion, index) => {
    console.log(`[${index + 1}] ${suggestion.setting.displayName}`);
    console.log(`    Policy: ${suggestion.policy.policyName}`);
    console.log(`    Current setting: ${suggestion.setting.settingName}`);
    console.log(`    Current value: ${suggestion.currentValue}`);
    console.log(`    Possible child settings:`);

    suggestion.possibleChildren.forEach((child) => {
      const shortId = child.id.split('_').slice(-3).join('_');
      console.log(`      - ${shortId}`);
      console.log(`        Full ID: ${child.id}`);
      console.log(`        Value: ${child.value}`);
    });

    console.log('');
  });

  if (suggestions.length === 0) {
    console.log('✅ No settings found that need child mapping updates!\n');
  } else {
    console.log('='.repeat(80));
    console.log('RECOMMENDATIONS');
    console.log('='.repeat(80));
    console.log('For each setting above, consider:');
    console.log('1. Which child setting contains the specific value you want to validate?');
    console.log('2. Update the setting.settingName to point to that child setting');
    console.log('3. Update the expected value to match the child setting format');
    console.log('4. Re-run validation\n');
  }

  await prisma.$disconnect();
}

suggestChildSettingMappings();
