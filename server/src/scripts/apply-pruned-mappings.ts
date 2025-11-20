/**
 * Apply Pruned Mappings Script
 *
 * This script:
 * 1. Deletes existing control-setting mappings for controls 03.01.01-03.01.12
 * 2. Runs the import to add the pruned mappings from the new file
 *
 * Usage: npx tsx src/scripts/apply-pruned-mappings.ts
 */

import { PrismaClient } from '@prisma/client';
import { m365SettingsImportService } from '../services/m365SettingsImport.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Controls that were pruned (03.01.01 through 03.01.12)
const PRUNED_CONTROLS = [
  '03.01.01',
  '03.01.02',
  '03.01.03',
  '03.01.04',
  '03.01.05',
  '03.01.06',
  '03.01.07',
  '03.01.08',
  '03.01.09',
  '03.01.10',
  '03.01.11',
  '03.01.12',
];

async function main() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 APPLY PRUNED MAPPINGS SCRIPT');
    console.log('='.repeat(80) + '\n');

    // Step 1: Get current state
    console.log('📊 Step 1: Checking current state...\n');

    const controls = await prisma.control.findMany({
      where: {
        controlId: { in: PRUNED_CONTROLS },
      },
      select: {
        id: true,
        controlId: true,
        _count: {
          select: { settingMappings: true },
        },
      },
    });

    let totalCurrentMappings = 0;
    console.log('Current mapping counts for pruned controls:');
    controls.forEach((control) => {
      console.log(`   ${control.controlId}: ${control._count.settingMappings} mappings`);
      totalCurrentMappings += control._count.settingMappings;
    });
    console.log(`\n   Total: ${totalCurrentMappings} mappings to be replaced\n`);

    // Step 2: Delete existing mappings for pruned controls
    console.log('🗑️  Step 2: Deleting existing mappings for pruned controls...\n');

    const controlIds = controls.map(c => c.id);

    const deleteResult = await prisma.controlSettingMapping.deleteMany({
      where: {
        controlId: { in: controlIds },
      },
    });

    console.log(`   Deleted ${deleteResult.count} existing mappings\n`);

    // Step 3: Run the import to add new pruned mappings
    console.log('📥 Step 3: Importing new pruned mappings...\n');

    const stats = await m365SettingsImportService.importAll();

    // Step 4: Verify results
    console.log('\n📊 Step 4: Verifying results...\n');

    const updatedControls = await prisma.control.findMany({
      where: {
        controlId: { in: PRUNED_CONTROLS },
      },
      select: {
        id: true,
        controlId: true,
        _count: {
          select: { settingMappings: true },
        },
      },
      orderBy: { controlId: 'asc' },
    });

    let totalNewMappings = 0;
    console.log('New mapping counts for pruned controls:');
    updatedControls.forEach((control) => {
      const status = control._count.settingMappings >= 6 && control._count.settingMappings <= 8
        ? '✅'
        : '⚠️';
      console.log(`   ${status} ${control.controlId}: ${control._count.settingMappings} mappings`);
      totalNewMappings += control._count.settingMappings;
    });
    console.log(`\n   Total: ${totalNewMappings} mappings (reduced from ${totalCurrentMappings})`);
    console.log(`   Reduction: ${totalCurrentMappings - totalNewMappings} mappings removed\n`);

    // Get total database counts
    const totalDbMappings = await prisma.controlSettingMapping.count();
    console.log(`📊 Total mappings in database: ${totalDbMappings}`);

    // Exit with appropriate code
    if (stats.errors.length > 0) {
      logger.warn('Import completed with errors. Review logs above.');
      process.exit(1);
    } else {
      console.log('\n' + '='.repeat(80));
      console.log('✅ PRUNED MAPPINGS APPLIED SUCCESSFULLY!');
      console.log('='.repeat(80) + '\n');
      process.exit(0);
    }
  } catch (error) {
    logger.error('❌ Script failed:', error);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
