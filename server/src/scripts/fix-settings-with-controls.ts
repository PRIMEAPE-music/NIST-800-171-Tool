import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Focus on fixing settings that have control mappings
 * These are the high-value settings we need to get working
 */

async function fixSettingsWithControls() {
  console.log('\n' + '='.repeat(80));
  console.log('ANALYZING SETTINGS WITH CONTROL MAPPINGS');
  console.log('='.repeat(80) + '\n');

  // Get policies with their actual property names
  const policies = await prisma.m365Policy.findMany({
    select: {
      id: true,
      policyName: true,
      odataType: true,
      policyData: true,
    }
  });

  // Map template -> available properties
  const templateProperties = new Map<string, Set<string>>();

  for (const policy of policies) {
    if (!policy.odataType) continue;

    if (!templateProperties.has(policy.odataType)) {
      templateProperties.set(policy.odataType, new Set());
    }

    try {
      const policyData = JSON.parse(policy.policyData);
      Object.keys(policyData).forEach(key => {
        if (!key.startsWith('@odata') && key !== 'id') {
          templateProperties.get(policy.odataType)!.add(key);
        }
      });
    } catch (error) {
      // Skip
    }
  }

  // Get all settings that have control mappings
  const settingsWithControls = await prisma.m365Setting.findMany({
    where: {
      controlMappings: {
        some: {}
      },
      isActive: true,
    },
    include: {
      controlMappings: {
        include: {
          control: {
            select: { controlId: true }
          }
        }
      }
    },
    orderBy: [
      { policyTemplate: 'asc' },
      { displayName: 'asc' }
    ]
  });

  console.log(`Found ${settingsWithControls.length} settings with control mappings\n`);

  // Group by template
  const byTemplate = new Map<string, typeof settingsWithControls>();
  for (const setting of settingsWithControls) {
    if (!byTemplate.has(setting.policyTemplate)) {
      byTemplate.set(setting.policyTemplate, []);
    }
    byTemplate.get(setting.policyTemplate)!.push(setting);
  }

  console.log('Breakdown by template:');
  for (const [template, settings] of byTemplate) {
    const availableProps = templateProperties.get(template);
    console.log(`\n${template}`);
    console.log(`  Settings with controls: ${settings.length}`);
    console.log(`  Available properties: ${availableProps?.size || 0}`);

    if (!availableProps || availableProps.size === 0) {
      console.log(`  ⚠️  No policy data available for this template!`);
      continue;
    }

    // Check how many settings have matching property names
    let matchCount = 0;
    let missingCount = 0;

    for (const setting of settings.slice(0, 10)) {
      const hasMatch = setting.settingName && availableProps.has(setting.settingName);

      if (hasMatch) {
        matchCount++;
      } else {
        missingCount++;
        const controls = setting.controlMappings.map(m => m.control.controlId).join(', ');
        console.log(`  ❌ ${setting.displayName}`);
        console.log(`     Current settingName: ${setting.settingName || 'NULL'}`);
        console.log(`     Controls: ${controls}`);
        console.log(`     Available properties: ${Array.from(availableProps).slice(0, 5).join(', ')}...`);
      }
    }

    if (settings.length > 10) {
      console.log(`  ... and ${settings.length - 10} more settings`);
    }

    console.log(`\n  Summary: ${matchCount} matched, ${missingCount} missing (from first 10)`);
  }

  await prisma.$disconnect();
}

fixSettingsWithControls().catch(console.error);
