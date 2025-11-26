/**
 * Sync Setting Paths to Match Setting Names
 *
 * Updates settingPath to match settingName for better extraction
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncSettingPathsToNames() {
  console.log('\n' + '='.repeat(80));
  console.log('SYNC SETTING PATHS TO MATCH SETTING NAMES');
  console.log('='.repeat(80) + '\n');

  // Find settings where settingName looks like a definition ID but settingPath doesn't match
  const settings = await prisma.m365Setting.findMany({
    where: {
      AND: [
        { settingName: { contains: 'device_vendor_msft' } },
        {
          OR: [
            { settingPath: { not: { equals: prisma.m365Setting.fields.settingName } } },
            { settingPath: { not: { contains: 'device_vendor_msft' } } },
          ],
        },
      ],
    },
  });

  console.log(`Found ${settings.length} settings with mismatched paths:\n`);

  let updateCount = 0;

  for (const setting of settings) {
    console.log(`📋 ${setting.displayName}`);
    console.log(`   settingName: ${setting.settingName}`);
    console.log(`   settingPath: ${setting.settingPath}`);

    // Update settingPath to match settingName
    await prisma.m365Setting.update({
      where: { id: setting.id },
      data: { settingPath: setting.settingName },
    });

    console.log(`   ✅ Updated settingPath to: ${setting.settingName}\n`);
    updateCount++;
  }

  console.log('='.repeat(80));
  console.log(`Updated ${updateCount} settings`);
  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

syncSettingPathsToNames();
