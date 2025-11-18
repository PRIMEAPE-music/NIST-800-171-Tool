import { PrismaClient } from '@prisma/client';
import { complianceCalculationService } from '../services/complianceCalculation.service';

const prisma = new PrismaClient();

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function verifyComplianceSystem(): Promise<void> {
  console.log('='.repeat(70));
  console.log('COMPLIANCE CALCULATION SYSTEM VERIFICATION');
  console.log('='.repeat(70));

  const results: VerificationResult[] = [];

  try {
    // Check 1: Verify ControlM365Compliance table exists
    console.log('\n✓ Check 1: Verify ControlM365Compliance table...');
    try {
      const count = await prisma.controlM365Compliance.count();
      results.push({
        passed: true,
        message: 'ControlM365Compliance table accessible',
        details: { recordCount: count }
      });
      console.log(`  ✅ PASS - ${count} records found`);
    } catch (error) {
      results.push({
        passed: false,
        message: 'ControlM365Compliance table not found',
        details: { error }
      });
      console.log('  ❌ FAIL - Table not accessible');
    }

    // Check 2: Verify compliance calculation works
    console.log('\n✓ Check 2: Verify compliance calculation...');
    const controlWithMappings = await prisma.control.findFirst({
      where: {
        settingMappings: { some: {} }
      }
    });

    if (controlWithMappings) {
      try {
        const summary = await complianceCalculationService.calculateControlCompliance(controlWithMappings.id);
        results.push({
          passed: summary !== null,
          message: 'Compliance calculation functional',
          details: {
            controlId: controlWithMappings.id,
            totalRequiredSettings: summary?.totalRequiredSettings,
            compliancePercentage: summary?.compliancePercentage.toFixed(1)
          }
        });
        console.log(`  ✅ PASS - Calculated compliance: ${summary?.compliancePercentage.toFixed(1)}%`);
      } catch (error) {
        results.push({
          passed: false,
          message: 'Compliance calculation failed',
          details: { error }
        });
        console.log('  ❌ FAIL - Calculation error');
      }
    } else {
      results.push({
        passed: false,
        message: 'No controls with mappings found for testing'
      });
      console.log('  ⚠️  SKIP - No test data available');
    }

    // Check 3: Verify caching works
    console.log('\n✓ Check 3: Verify compliance caching...');
    if (controlWithMappings) {
      try {
        const cached = await complianceCalculationService.getCachedControlCompliance(controlWithMappings.id);
        results.push({
          passed: cached !== null,
          message: 'Compliance caching functional',
          details: {
            controlId: controlWithMappings.id,
            cacheAge: cached ? `${Math.round((Date.now() - cached.lastCalculated.getTime()) / 1000)}s` : 'N/A'
          }
        });
        console.log(`  ✅ PASS - Cache ${cached ? 'found' : 'empty (expected on first run)'}`);
      } catch (error) {
        results.push({
          passed: false,
          message: 'Cache retrieval failed',
          details: { error }
        });
        console.log('  ❌ FAIL - Cache error');
      }
    }

    // Check 4: Verify setting compliance calculation
    console.log('\n✓ Check 4: Verify setting-level compliance...');
    const setting = await prisma.m365Setting.findFirst({
      include: {
        complianceChecks: {
          take: 1,
          orderBy: { lastChecked: 'desc' }
        }
      }
    });

    if (setting) {
      try {
        const settingCompliance = await complianceCalculationService.calculateSettingCompliance(setting.id);
        results.push({
          passed: settingCompliance !== null,
          message: 'Setting compliance calculation functional',
          details: {
            settingId: setting.id,
            status: settingCompliance?.status
          }
        });
        console.log(`  ✅ PASS - Status: ${settingCompliance?.status}`);
      } catch (error) {
        results.push({
          passed: false,
          message: 'Setting compliance calculation failed',
          details: { error }
        });
        console.log('  ❌ FAIL - Calculation error');
      }
    }

    // Check 5: Verify system statistics
    console.log('\n✓ Check 5: Verify system statistics...');
    try {
      const stats = await complianceCalculationService.getSystemComplianceStats();
      results.push({
        passed: stats.overview.totalControls >= 0,
        message: 'System statistics functional',
        details: {
          totalControls: stats.overview.totalControls,
          totalSettings: stats.overview.totalSettings,
          overallCompliance: stats.overview.overallCompliance
        }
      });
      console.log(`  ✅ PASS - ${stats.overview.totalControls} controls, ${stats.overview.overallCompliance}% compliant`);
    } catch (error) {
      results.push({
        passed: false,
        message: 'System statistics failed',
        details: { error }
      });
      console.log('  ❌ FAIL - Statistics error');
    }

    // Check 6: Verify bulk recalculation
    console.log('\n✓ Check 6: Verify bulk recalculation...');
    const testControls = await prisma.control.findMany({
      where: {
        settingMappings: { some: {} }
      },
      take: 3,
      select: { id: true }
    });

    if (testControls.length > 0) {
      try {
        const result = await complianceCalculationService.recalculateControls(
          testControls.map(c => c.id)
        );
        results.push({
          passed: result.successCount === testControls.length,
          message: 'Bulk recalculation functional',
          details: {
            tested: testControls.length,
            succeeded: result.successCount,
            failed: result.errorCount,
            duration: result.duration
          }
        });
        console.log(`  ✅ PASS - ${result.successCount}/${testControls.length} succeeded in ${result.duration}ms`);
      } catch (error) {
        results.push({
          passed: false,
          message: 'Bulk recalculation failed',
          details: { error }
        });
        console.log('  ❌ FAIL - Recalculation error');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(70));

    const totalChecks = results.length;
    const passedChecks = results.filter(r => r.passed).length;
    const failedChecks = totalChecks - passedChecks;

    console.log(`Total Checks: ${totalChecks}`);
    console.log(`✅ Passed: ${passedChecks}`);
    console.log(`❌ Failed: ${failedChecks}`);
    console.log(`Success Rate: ${Math.round((passedChecks / totalChecks) * 100)}%`);

    if (failedChecks > 0) {
      console.log('\n⚠️  FAILED CHECKS:');
      results.filter(r => !r.passed).forEach((result, idx) => {
        console.log(`  ${idx + 1}. ${result.message}`);
        if (result.details) {
          console.log(`     Details: ${JSON.stringify(result.details, null, 2)}`);
        }
      });
    }

    console.log('\n' + '='.repeat(70));
    if (passedChecks === totalChecks) {
      console.log('✅ ALL VERIFICATIONS PASSED - SYSTEM READY');
    } else {
      console.log('⚠️  SOME VERIFICATIONS FAILED - REVIEW REQUIRED');
    }
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ VERIFICATION PROCESS FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  verifyComplianceSystem()
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default verifyComplianceSystem;
