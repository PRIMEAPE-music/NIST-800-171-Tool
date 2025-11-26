/**
 * Restore M365Setting Records from Backup
 *
 * Restores settings from a backup JSON file
 *
 * Run with: npx tsx server/src/scripts/restore-settings.ts [backup-file]
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function restoreSettings(backupFile: string) {
  console.log(`Restoring from backup: ${backupFile}\n`);

  if (!fs.existsSync(backupFile)) {
    console.error('❌ Backup file not found!');
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

  console.log(`Found ${backup.length} settings in backup\n`);
  console.log('⚠️  This will overwrite current settingPath and pathVariants values!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  await new Promise((resolve) => setTimeout(resolve, 5000));

  let restored = 0;
  for (const setting of backup) {
    try {
      await prisma.m365Setting.update({
        where: { id: setting.id },
        data: {
          settingPath: setting.settingPath,
          pathVariants: setting.pathVariants,
        },
      });
      restored++;
      process.stdout.write(`\rRestored: ${restored}/${backup.length}`);
    } catch (error: any) {
      console.error(`\n❌ Failed to restore setting ${setting.id}: ${error.message}`);
    }
  }

  console.log(`\n\n✅ Restoration complete: ${restored}/${backup.length} settings restored\n`);

  await prisma.$disconnect();
}

const backupFile = process.argv[2];
if (!backupFile) {
  console.error('Usage: npx tsx server/src/scripts/restore-settings.ts <backup-file>');
  process.exit(1);
}

restoreSettings(backupFile).catch(console.error);
