import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backupPolicies() {
  try {
    console.log('🔄 Starting policy backup...');

    // Fetch all policies
    const policies = await prisma.m365Policy.findMany();

    console.log(`✓ Found ${policies.length} policies to backup`);

    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `policies-backup-${timestamp}.json`);

    // Write backup file
    fs.writeFileSync(backupFile, JSON.stringify(policies, null, 2));

    console.log(`✅ Backup completed successfully!`);
    console.log(`   File: ${backupFile}`);
    console.log(`   Total policies: ${policies.length}`);

    return backupFile;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run backup if called directly
if (require.main === module) {
  backupPolicies()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default backupPolicies;
