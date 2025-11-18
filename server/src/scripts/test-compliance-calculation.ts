import { PrismaClient } from '@prisma/client';
import { complianceCalculationService } from '../services/complianceCalculation.service';

const prisma = new PrismaClient();

async function testComplianceCalculation() {
  console.log('='.repeat(60));
  console.log('COMPLIANCE CALCULATION SERVICE TEST');
  console.log('='.repeat(60));

  try {
    // Test 1: Calculate compliance for a single setting
    console.log('\n📊 TEST 1: Calculate Setting Compliance');
    console.log('-'.repeat(60));

    const firstSetting = await prisma.m365Setting.findFirst();
    if (firstSetting) {
      const settingCompliance = await complianceCalculationService.calculateSettingCompliance(firstSetting.id);
      console.log('Setting:', firstSetting.displayName);
      console.log('Status:', settingCompliance?.status);
      console.log('Is Compliant:', settingCompliance?.isCompliant);
      console.log('Confidence:', settingCompliance?.confidence);
      console.log('Platform:', settingCompliance?.platform);
    } else {
      console.log('⚠️  No settings found in database');
    }

    // Test 2: Calculate compliance for a control
    console.log('\n📊 TEST 2: Calculate Control Compliance');
    console.log('-'.repeat(60));

    const controlWithMappings = await prisma.control.findFirst({
      where: {
        settingMappings: {
          some: {}
        }
      },
      include: {
        settingMappings: true
      }
    });

    if (controlWithMappings) {
      console.log(`Calculating for: ${controlWithMappings.controlId} - ${controlWithMappings.title}`);
      console.log(`Settings mapped: ${controlWithMappings.settingMappings.length}`);

      const controlCompliance = await complianceCalculationService.calculateControlCompliance(controlWithMappings.id);

      if (controlCompliance) {
        console.log('\nResults:');
        console.log(`  Total Settings: ${controlCompliance.totalRequiredSettings}`);
        console.log(`  Compliant: ${controlCompliance.compliantSettings}`);
        console.log(`  Non-Compliant: ${controlCompliance.nonCompliantSettings}`);
        console.log(`  Not Configured: ${controlCompliance.notConfiguredSettings}`);
        console.log(`  Compliance %: ${controlCompliance.compliancePercentage.toFixed(1)}%`);

        console.log('\nConfidence Breakdown:');
        console.log(`  High: ${controlCompliance.highConfidenceCount}`);
        console.log(`  Medium: ${controlCompliance.mediumConfidenceCount}`);
        console.log(`  Low: ${controlCompliance.lowConfidenceCount}`);

        console.log('\nPlatform Coverage:');
        if (controlCompliance.windowsCoverage > 0) {
          console.log(`  Windows: ${controlCompliance.windowsCoverage.toFixed(1)}%`);
        }
        if (controlCompliance.iosCoverage > 0) {
          console.log(`  iOS: ${controlCompliance.iosCoverage.toFixed(1)}%`);
        }
        if (controlCompliance.androidCoverage > 0) {
          console.log(`  Android: ${controlCompliance.androidCoverage.toFixed(1)}%`);
        }
      }
    } else {
      console.log('⚠️  No controls with mappings found');
    }

    // Test 3: Test caching
    console.log('\n📊 TEST 3: Test Compliance Caching');
    console.log('-'.repeat(60));

    if (controlWithMappings) {
      const cached = await complianceCalculationService.getCachedControlCompliance(controlWithMappings.id);
      if (cached) {
        console.log('✅ Cache found!');
        console.log(`  Cached at: ${cached.lastCalculated.toISOString()}`);
        console.log(`  Compliance: ${cached.compliancePercentage.toFixed(1)}%`);
      } else {
        console.log('⚠️  No cache found (expected if first run)');
      }
    }

    // Test 4: Get system-wide statistics
    console.log('\n📊 TEST 4: System Compliance Statistics');
    console.log('-'.repeat(60));

    const stats = await complianceCalculationService.getSystemComplianceStats();
    console.log('Overview:');
    console.log(`  Total Controls: ${stats.overview.totalControls}`);
    console.log(`  Total Settings: ${stats.overview.totalSettings}`);
    console.log(`  Overall Compliance: ${stats.overview.overallCompliance}%`);
    console.log(`  Avg Compliance: ${stats.overview.avgCompliancePercentage}%`);

    console.log('\nTop Families by Compliance:');
    const familiesSorted = Object.entries(stats.byFamily)
      .sort(([, a]: any, [, b]: any) => b.compliancePercentage - a.compliancePercentage)
      .slice(0, 5);

    familiesSorted.forEach(([family, data]: any) => {
      console.log(`  ${family}: ${data.compliancePercentage}% (${data.compliantSettings}/${data.totalSettings})`);
    });

    // Test 5: Bulk recalculation (sample)
    console.log('\n📊 TEST 5: Bulk Recalculation (5 controls)');
    console.log('-'.repeat(60));

    const sampleControls = await prisma.control.findMany({
      where: {
        settingMappings: {
          some: {}
        }
      },
      take: 5,
      select: { id: true }
    });

    if (sampleControls.length > 0) {
      const controlIds = sampleControls.map(c => c.id);
      const result = await complianceCalculationService.recalculateControls(controlIds);

      console.log(`✅ Success: ${result.successCount}/${result.totalControls}`);
      console.log(`❌ Errors: ${result.errorCount}`);
      console.log(`⏱️  Duration: ${result.duration}ms`);

      if (result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach(err => {
          console.log(`  - ${err.controlId}: ${err.error}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  testComplianceCalculation()
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default testComplianceCalculation;
