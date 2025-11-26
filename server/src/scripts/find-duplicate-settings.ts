/**
 * Find and Remove Duplicate Settings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findDuplicateSettings() {
  console.log('\n' + '='.repeat(80));
  console.log('FIND DUPLICATE SETTINGS');
  console.log('='.repeat(80) + '\n');

  // Find settings with same settingName
  const allSettings = await prisma.m365Setting.findMany({
    orderBy: [{ settingName: 'asc' }, { id: 'asc' }],
  });

  const settingsByName = new Map<string, any[]>();

  for (const setting of allSettings) {
    if (!setting.settingName) continue;

    if (!settingsByName.has(setting.settingName)) {
      settingsByName.set(setting.settingName, []);
    }
    settingsByName.get(setting.settingName)!.push(setting);
  }

  const duplicates = Array.from(settingsByName.entries()).filter(([_, settings]) => settings.length > 1);

  console.log(`Found ${duplicates.length} settings with duplicates:\n`);

  let toDelete: number[] = [];

  for (const [settingName, settings] of duplicates) {
    console.log(`📋 ${settingName}: ${settings.length} copies`);

    settings.forEach((s, i) => {
      console.log(`   [${i}] ID ${s.id}:`);
      console.log(`       displayName: ${s.displayName}`);
      console.log(`       settingPath: ${s.settingPath}`);
      console.log(`       expectedValue: ${s.expectedValue}`);
      console.log(`       _count mappings: ${s.controlMappings?.length || 0}`);
    });

    // Keep the setting with mappings, or the first one if none have mappings
    const withMappings = await Promise.all(
      settings.map(async (s) => {
        const count = await prisma.controlSettingMapping.count({ where: { settingId: s.id } });
        return { setting: s, mappingCount: count };
      })
    );

    const sorted = withMappings.sort((a, b) => b.mappingCount - a.mappingCount);

    console.log(`   ✅ Keeping ID ${sorted[0].setting.id} (${sorted[0].mappingCount} mappings)`);

    for (let i = 1; i < sorted.length; i++) {
      console.log(`   ❌ Will delete ID ${sorted[i].setting.id} (${sorted[i].mappingCount} mappings)`);
      toDelete.push(sorted[i].setting.id);
    }

    console.log('');
  }

  if (toDelete.length > 0) {
    console.log('='.repeat(80));
    console.log(`Ready to delete ${toDelete.length} duplicate settings`);
    console.log('='.repeat(80) + '\n');

    // Delete duplicates
    for (const id of toDelete) {
      await prisma.m365Setting.delete({ where: { id } });
      console.log(`✅ Deleted setting ID ${id}`);
    }

    console.log(`\n✅ Deleted ${toDelete.length} duplicate settings\n`);
  } else {
    console.log('✅ No duplicates to delete\n');
  }

  await prisma.$disconnect();
}

findDuplicateSettings();
