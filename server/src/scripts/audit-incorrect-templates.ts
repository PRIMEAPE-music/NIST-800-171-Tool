import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function auditIncorrectTemplates() {
  console.log('\n' + '='.repeat(70));
  console.log('AUDIT: SETTINGS WITH POTENTIALLY INCORRECT TEMPLATES');
  console.log('='.repeat(70) + '\n');

  try {
    // Windows-specific settings with iOS templates
    console.log('🔍 Finding Windows settings with iOS templates...\n');

    const windowsWithiOS = await prisma.m365Setting.findMany({
      where: {
        AND: [
          {
            OR: [
              { settingName: { contains: 'Windows' } },
              { settingName: { contains: 'AppLocker' } },
              { settingName: { contains: 'PowerShell' } },
              { settingName: { contains: 'Credential Guard' } },
              { settingName: { contains: 'BitLocker' } },
            ],
          },
          {
            policyTemplate: {
              contains: 'ios',
            },
          },
        ],
      },
    });

    console.log(`Found ${windowsWithiOS.length} Windows settings with iOS templates:\n`);

    windowsWithiOS.forEach(s => {
      console.log(`ID: ${s.id}`);
      console.log(`  Setting: ${s.settingName}`);
      console.log(`  Current Template: ${s.policyTemplate}`);
      console.log(`  Setting Path: ${s.settingPath || 'N/A'}`);
      console.log(`  Suggested: Windows-specific template (Intune/Settings Catalog)\n`);
    });

    // Defender settings with wrong templates
    console.log('\n🔍 Finding Defender settings with non-Defender templates...\n');

    const defenderMismatch = await prisma.m365Setting.findMany({
      where: {
        AND: [
          {
            OR: [
              { settingName: { contains: 'Defender' } },
              { settingName: { contains: 'Antivirus' } },
            ],
          },
          {
            policyTemplate: {
              not: {
                contains: 'defender',
              },
            },
          },
          {
            policyTemplate: {
              not: null,
            },
          },
        ],
      },
    });

    console.log(`Found ${defenderMismatch.length} Defender settings with non-Defender templates:\n`);

    defenderMismatch.forEach(s => {
      console.log(`ID: ${s.id}`);
      console.log(`  Setting: ${s.settingName}`);
      console.log(`  Current Template: ${s.policyTemplate}`);
      console.log(`  Suggested: Defender ATP or Antivirus template\n`);
    });

    // Check for other mismatches: macOS/Android with Windows templates
    console.log('\n🔍 Finding mobile settings with Windows templates...\n');

    const mobileMismatch = await prisma.m365Setting.findMany({
      where: {
        AND: [
          {
            OR: [
              { settingName: { contains: 'macOS' } },
              { settingName: { contains: 'Android' } },
              { settingName: { contains: 'iOS' } },
            ],
          },
          {
            policyTemplate: {
              contains: 'windows',
            },
          },
        ],
      },
    });

    console.log(`Found ${mobileMismatch.length} mobile settings with Windows templates:\n`);

    mobileMismatch.forEach(s => {
      console.log(`ID: ${s.id}`);
      console.log(`  Setting: ${s.settingName}`);
      console.log(`  Current Template: ${s.policyTemplate}`);
      console.log(`  Suggested: Platform-appropriate template\n`);
    });

    // Export results
    const allIssues = [...windowsWithiOS, ...defenderMismatch, ...mobileMismatch];
    const csvRows = allIssues.map(s =>
      `${s.id},"${(s.settingName || '').replace(/"/g, '""')}","${(s.policyTemplate || '').replace(/"/g, '""')}","${s.templateFamily || ''}","Needs Review"`
    );

    const csv = ['ID,Setting Name,Current Template,Template Family,Issue'].concat(csvRows).join('\n');

    fs.writeFileSync('incorrect-templates-audit.csv', csv);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Windows with iOS templates: ${windowsWithiOS.length}`);
    console.log(`Defender mismatches: ${defenderMismatch.length}`);
    console.log(`Mobile mismatches: ${mobileMismatch.length}`);
    console.log(`Total issues: ${allIssues.length}`);
    console.log('\n✅ Audit complete. Results exported to incorrect-templates-audit.csv');
    console.log('='.repeat(70));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

auditIncorrectTemplates();
