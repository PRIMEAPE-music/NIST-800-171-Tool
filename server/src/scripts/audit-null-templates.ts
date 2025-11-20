import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function auditNullTemplates() {
  console.log('\n' + '='.repeat(70));
  console.log('AUDIT: SETTINGS WITH NULL TEMPLATES');
  console.log('='.repeat(70) + '\n');

  try {
    const nullTemplateSettings = await prisma.m365Setting.findMany({
      where: {
        policyTemplate: null,
      },
      orderBy: {
        templateFamily: 'asc',
      },
    });

    console.log(`Total settings with NULL templates: ${nullTemplateSettings.length}\n`);

    // Group by template family
    const byCategory: { [key: string]: any[] } = {};
    nullTemplateSettings.forEach(setting => {
      const cat = setting.templateFamily || 'Unknown';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(setting);
    });

    // Display grouped results
    for (const [category, settings] of Object.entries(byCategory)) {
      console.log(`\n${category} (${settings.length} settings):`);
      console.log('='.repeat(70));

      settings.forEach(setting => {
        console.log(`\nID: ${setting.id}`);
        console.log(`Setting: ${setting.settingName}`);
        console.log(`Description: ${setting.description?.substring(0, 100)}...`);
        console.log(`Setting Path: ${setting.settingPath || 'N/A'}`);
        console.log(`Template Family: ${setting.templateFamily || 'N/A'}`);
      });
    }

    // Export to CSV for manual review
    const csvRows = nullTemplateSettings.map(s =>
      `${s.id},"${(s.settingName || '').replace(/"/g, '""')}","${s.templateFamily || ''}","${(s.settingPath || '').replace(/"/g, '""')}"`
    );

    const csv = ['ID,Setting Name,Template Family,Setting Path', ...csvRows].join('\n');

    fs.writeFileSync('null-templates-audit.csv', csv);

    console.log('\n' + '='.repeat(70));
    console.log(`✅ Audit complete. Results exported to null-templates-audit.csv`);
    console.log('='.repeat(70));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

auditNullTemplates();
