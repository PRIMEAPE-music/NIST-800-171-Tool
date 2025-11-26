/**
 * Backup M365Setting Records
 *
 * Creates a JSON backup of all M365Setting records before applying corrections
 *
 * Run with: npx tsx server/src/scripts/backup-settings.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backupSettings() {
  console.log('Creating backup of M365Setting records...\n');

  const settings = await prisma.m365Setting.findMany({
    orderBy: { id: 'asc' },
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `m365-settings-backup-${timestamp}.json`);

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Write backup
  fs.writeFileSync(backupFile, JSON.stringify(settings, null, 2));

  console.log(`✅ Backup created: ${backupFile}`);
  console.log(`   Records: ${settings.length}`);
  console.log(`   Size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB\n`);

  await prisma.$disconnect();
}

backupSettings().catch(console.error);
