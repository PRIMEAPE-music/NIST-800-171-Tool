import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUnmatchedSettings() {
  try {
    console.log('='.repeat(70));
    console.log('UNMATCHED SETTINGS ANALYSIS');
    console.log('='.repeat(70));

    // Get all settings
    const allSettings = await prisma.m365Setting.findMany({
      where: { isActive: true },
      select: {
        id: true,
        displayName: true,
        policyTemplate: true,
        templateFamily: true
      }
    });

    // Get settings that have compliance checks
    const settingsWithChecks = await prisma.settingComplianceCheck.findMany({
      distinct: ['settingId'],
      select: { settingId: true }
    });
    const settingIdsWithChecks = new Set(settingsWithChecks.map(s => s.settingId));

    // Find settings without any compliance checks
    const unmatchedSettings = allSettings.filter(s => !settingIdsWithChecks.has(s.id));

    console.log(`\nTotal active settings: ${allSettings.length}`);
    console.log(`Settings with compliance checks: ${settingIdsWithChecks.size}`);
    console.log(`Settings WITHOUT checks: ${unmatchedSettings.length}`);

    // Group unmatched by template
    const byTemplate: Record<string, number> = {};
    const byFamily: Record<string, number> = {};

    for (const setting of unmatchedSettings) {
      const template = setting.policyTemplate || 'NULL';
      const family = setting.templateFamily || 'NULL';
      byTemplate[template] = (byTemplate[template] || 0) + 1;
      byFamily[family] = (byFamily[family] || 0) + 1;
    }

    console.log('\n' + '-'.repeat(70));
    console.log('UNMATCHED SETTINGS BY POLICY TEMPLATE');
    console.log('-'.repeat(70));

    const sortedTemplates = Object.entries(byTemplate)
      .sort((a, b) => b[1] - a[1]);

    for (const [template, count] of sortedTemplates) {
      console.log(`  ${count.toString().padStart(4)} - ${template}`);
    }

    console.log('\n' + '-'.repeat(70));
    console.log('UNMATCHED SETTINGS BY FAMILY');
    console.log('-'.repeat(70));

    const sortedFamilies = Object.entries(byFamily)
      .sort((a, b) => b[1] - a[1]);

    for (const [family, count] of sortedFamilies) {
      console.log(`  ${count.toString().padStart(4)} - ${family}`);
    }

    // Check which policies exist
    console.log('\n' + '-'.repeat(70));
    console.log('AVAILABLE POLICIES');
    console.log('-'.repeat(70));

    const policies = await prisma.m365Policy.findMany({
      select: { odataType: true, templateFamily: true, policyName: true }
    });

    const policyTemplates = new Set(policies.map(p => p.odataType));

    console.log(`\nTotal policies: ${policies.length}`);
    console.log('\nPolicy templates available:');
    for (const p of policies) {
      console.log(`  ${p.odataType} (${p.templateFamily})`);
    }

    // Check which unmatched templates have no policy
    console.log('\n' + '-'.repeat(70));
    console.log('MISSING POLICIES (templates with settings but no policy)');
    console.log('-'.repeat(70));

    for (const [template, count] of sortedTemplates) {
      if (template !== 'NULL' && !policyTemplates.has(template)) {
        console.log(`  ${count.toString().padStart(4)} settings need: ${template}`);
      }
    }

    // Check control mappings for unmatched settings
    console.log('\n' + '-'.repeat(70));
    console.log('CONTROL IMPACT');
    console.log('-'.repeat(70));

    const unmatchedIds = unmatchedSettings.map(s => s.id);
    const affectedMappings = await prisma.controlSettingMapping.count({
      where: { settingId: { in: unmatchedIds } }
    });

    const affectedControls = await prisma.controlSettingMapping.findMany({
      where: { settingId: { in: unmatchedIds } },
      distinct: ['controlId'],
      select: { controlId: true }
    });

    console.log(`\nControl-setting mappings affected: ${affectedMappings}`);
    console.log(`Controls affected: ${affectedControls.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUnmatchedSettings();
