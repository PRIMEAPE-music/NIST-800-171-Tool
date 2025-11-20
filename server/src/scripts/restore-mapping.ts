import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function restoreMapping() {
  const backupFile = process.argv[2];

  if (!backupFile) {
    console.log('Usage: npx tsx src/scripts/restore-mapping.ts <backup-file.json>');
    process.exit(1);
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  console.log('RESTORE SETTINGS MAPPING FROM BACKUP');
  console.log('='.repeat(80) + '\n');

  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

  console.log(`Backup timestamp: ${backup.timestamp}`);
  console.log(`Total settings in backup: ${backup.totalSettings}\n`);

  console.log('🔄 Restoring mappings...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const mapping of backup.mappings) {
    try {
      await prisma.m365Setting.update({
        where: { id: mapping.id },
        data: {
          policyTemplate: mapping.policyTemplate,
          templateFamily: mapping.templateFamily
        }
      });
      successCount++;
    } catch (error) {
      console.log(`  ❌ Failed to restore setting ${mapping.id}: ${mapping.displayName}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('RESTORE COMPLETE');
  console.log('='.repeat(80) + '\n');

  console.log(`✅ Successfully restored: ${successCount} settings`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount} settings`);
  }

  await prisma.$disconnect();
}

restoreMapping().catch(console.error);
