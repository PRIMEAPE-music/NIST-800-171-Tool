/**
 * Revalidate All Policies Script
 *
 * Clears old compliance checks and re-runs validation with fixed template matching
 */

import { PrismaClient } from '@prisma/client';
import { validateAllPolicies } from '../services/m365-validation.service';
import { complianceCalculationService } from '../services/complianceCalculation.service';

const prisma = new PrismaClient();

async function revalidateAll() {
  console.log('\n' + '='.repeat(80));
  console.log('REVALIDATING ALL POLICIES');
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: Clear old compliance checks
    console.log('Step 1: Clearing old compliance checks...');
    const deleted = await prisma.settingComplianceCheck.deleteMany({});
    console.log(`  Deleted ${deleted.count} old checks\n`);

    // Step 2: Run validation
    console.log('Step 2: Running validation with smart extraction...\n');
    const validationResults = await validateAllPolicies();

    // Summary of validation
    let totalChecks = 0;
    let totalExtracted = 0;
    let totalCompliant = 0;

    for (const result of validationResults) {
      totalChecks += result.totalSettings;
      totalExtracted += result.extractedSettings;
      totalCompliant += result.complianceChecks.filter(c => c.isCompliant).length;
    }

    console.log('\n' + '-'.repeat(80));
    console.log('VALIDATION SUMMARY');
    console.log('-'.repeat(80));
    console.log(`  Policies validated: ${validationResults.length}`);
    console.log(`  Total settings checked: ${totalChecks}`);
    console.log(`  Values extracted: ${totalExtracted} (${totalChecks > 0 ? ((totalExtracted / totalChecks) * 100).toFixed(1) : 0}%)`);
    console.log(`  Compliant: ${totalCompliant} (${totalExtracted > 0 ? ((totalCompliant / totalExtracted) * 100).toFixed(1) : 0}%)`);

    // Step 3: Recalculate control compliance
    console.log('\nStep 3: Recalculating control compliance...\n');
    const recalcResult = await complianceCalculationService.recalculateAllControls();

    console.log('\n' + '='.repeat(80));
    console.log('RECALCULATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`  Controls processed: ${recalcResult.totalControls}`);
    console.log(`  Successful: ${recalcResult.successCount}`);
    console.log(`  Errors: ${recalcResult.errorCount}`);
    console.log(`  Duration: ${(recalcResult.duration / 1000).toFixed(2)}s`);

    if (recalcResult.errors.length > 0) {
      console.log('\nErrors:');
      recalcResult.errors.forEach(err => {
        console.log(`  - ${err.controlId}: ${err.error}`);
      });
    }

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('DONE!');
    console.log('='.repeat(80) + '\n');

    // Check new compliance check count
    const newCheckCount = await prisma.settingComplianceCheck.count();
    const newCompliantCount = await prisma.settingComplianceCheck.count({ where: { isCompliant: true } });

    console.log('Final database state:');
    console.log(`  Total compliance checks: ${newCheckCount}`);
    console.log(`  Compliant: ${newCompliantCount} (${newCheckCount > 0 ? ((newCompliantCount / newCheckCount) * 100).toFixed(1) : 0}%)\n`);

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

revalidateAll();
