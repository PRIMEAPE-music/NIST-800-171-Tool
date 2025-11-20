/**
 * Recalculate Compliance Script
 *
 * Recalculates compliance summaries for all controls
 * Run this after importing settings or syncing policies
 */

import { complianceCalculationService } from '../services/complianceCalculation.service';

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 RECALCULATING COMPLIANCE FOR ALL CONTROLS');
  console.log('='.repeat(80) + '\n');

  try {
    const result = await complianceCalculationService.recalculateAllControls();

    console.log('\n' + '='.repeat(80));
    console.log('📊 RECALCULATION RESULTS');
    console.log('='.repeat(80));
    console.log(`\n   Total Controls:  ${result.totalControls}`);
    console.log(`   ✅ Successful:   ${result.successCount}`);
    console.log(`   ❌ Errors:       ${result.errorCount}`);
    console.log(`   ⏱️  Duration:     ${(result.duration / 1000).toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      result.errors.forEach(err => {
        console.log(`   - ${err.controlId}: ${err.error}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Compliance recalculation complete!');
    console.log('='.repeat(80) + '\n');

    process.exit(result.errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Recalculation failed:', error);
    process.exit(1);
  }
}

main();
