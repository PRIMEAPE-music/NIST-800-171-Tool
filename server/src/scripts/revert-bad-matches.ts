import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Revert the 3 incorrect fuzzy matches
 */

async function revertBadMatches() {
  console.log('\n' + '='.repeat(80));
  console.log('REVERTING INCORRECT FUZZY MATCHES');
  console.log('='.repeat(80) + '\n');

  const badMatches = [
    {
      displayName: 'Minimum TLS Version 1.2',
      wrongValue: 'osMinimumVersion',
      correctValue: 'MinimumTLSVersion'
    },
    {
      displayName: 'Conditional Access - Locations Included',
      wrongValue: 'conditions.applications.includeApplications',
      correctValue: 'conditions.locations.includeLocations'
    },
    {
      displayName: 'Conditional Access - Exclude Locations',
      wrongValue: 'conditions.applications.excludeApplications',
      correctValue: 'conditions.locations.excludeLocations'
    }
  ];

  for (const match of badMatches) {
    console.log(`Reverting: ${match.displayName}`);
    console.log(`  From: ${match.wrongValue}`);
    console.log(`  To:   ${match.correctValue}`);

    const setting = await prisma.m365Setting.findFirst({
      where: {
        displayName: match.displayName
      }
    });

    if (setting) {
      await prisma.m365Setting.update({
        where: { id: setting.id },
        data: { settingName: match.correctValue }
      });
      console.log(`  ✅ Reverted\n`);
    } else {
      console.log(`  ⚠️  Setting not found\n`);
    }
  }

  console.log('='.repeat(80));
  console.log('DONE');
  console.log('='.repeat(80));

  await prisma.$disconnect();
}

revertBadMatches().catch(console.error);
