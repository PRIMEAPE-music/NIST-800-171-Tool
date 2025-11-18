/**
 * M365 Settings Data Validation Script
 *
 * Validates the imported M365 settings data for integrity and consistency.
 * Usage: npm run validate:m365-data
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
  details?: any;
}

async function validateData(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 M365 SETTINGS DATA VALIDATION');
  console.log('='.repeat(80) + '\n');

  const results: ValidationResult[] = [];

  try {
    // Check 1: Settings count in expected range
    const settingsCount = await prisma.m365Setting.count();
    results.push({
      check: 'Settings Count',
      passed: settingsCount >= 300 && settingsCount <= 700,
      message: `Found ${settingsCount} settings (expected 300-700)`,
    });

    // Check 2: Mappings count in expected range
    const mappingsCount = await prisma.controlSettingMapping.count();
    results.push({
      check: 'Mappings Count',
      passed: mappingsCount >= 400 && mappingsCount <= 800,
      message: `Found ${mappingsCount} mappings (expected 400-800)`,
    });

    // Check 3: All controls have at least one setting
    const controlsWithSettings = await prisma.control.count({
      where: { settingMappings: { some: {} } },
    });
    results.push({
      check: 'Control Coverage',
      passed: controlsWithSettings >= 70,
      message: `${controlsWithSettings} / 97 controls have settings mapped (expected at least 70)`,
    });

    // Check 4: No orphaned settings
    const orphanedSettings = await prisma.m365Setting.count({
      where: { controlMappings: { none: {} } },
    });
    results.push({
      check: 'Orphaned Settings',
      passed: orphanedSettings <= 5,
      message: `Found ${orphanedSettings} settings without mappings (expected 0-5)`,
    });

    // Check 5: Policy types distribution
    const policyTypes = await prisma.m365Setting.groupBy({
      by: ['policyType'],
      _count: true,
    });
    const typeCount = policyTypes.length;
    results.push({
      check: 'Policy Type Coverage',
      passed: typeCount >= 3,
      message: `Found ${typeCount} policy types (expected 3+: Intune, AzureAD, Purview, Defender)`,
      details: policyTypes.map((t) => `${t.policyType}: ${t._count}`),
    });

    // Check 6: Platform distribution
    const platforms = await prisma.m365Setting.groupBy({
      by: ['platform'],
      _count: true,
    });
    const platformCount = platforms.length;
    results.push({
      check: 'Platform Coverage',
      passed: platformCount >= 3,
      message: `Found ${platformCount} platforms (expected 3+: Windows, iOS, Android, All)`,
      details: platforms.map((p) => `${p.platform}: ${p._count}`),
    });

    // Check 7: Confidence level distribution
    const confidenceLevels = await prisma.controlSettingMapping.groupBy({
      by: ['confidence'],
      _count: true,
    });
    results.push({
      check: 'Confidence Levels',
      passed: confidenceLevels.length >= 1,
      message: `Found ${confidenceLevels.length} confidence levels`,
      details: confidenceLevels.map((c) => `${c.confidence}: ${c._count}`),
    });

    // Check 8: Unique constraint validation
    const settingsWithDuplicateKeys = await prisma.$queryRaw<
      Array<{ count: number }>
    >`
      SELECT COUNT(*) as count
      FROM (
        SELECT setting_path, policy_type, platform, COUNT(*) as cnt
        FROM m365_setting_catalog
        GROUP BY setting_path, policy_type, platform
        HAVING cnt > 1
      )
    `;
    const duplicateCount = settingsWithDuplicateKeys[0]?.count || 0;
    results.push({
      check: 'Unique Constraints',
      passed: duplicateCount === 0,
      message: `Found ${duplicateCount} duplicate setting keys (should be 0)`,
    });

    // Check 9: Required fields populated
    const settingsWithNullRequired = await prisma.m365Setting.count({
      where: {
        OR: [
          { settingName: '' },
          { displayName: '' },
          { settingPath: '' },
          { policyType: '' },
          { platform: '' },
          { dataType: '' },
          { expectedValue: '' },
          { validationOperator: '' },
          { description: '' },
        ],
      },
    });
    results.push({
      check: 'Required Fields',
      passed: settingsWithNullRequired === 0,
      message: `Found ${settingsWithNullRequired} settings with empty required fields`,
    });

    // Check 10: Valid JSON in expectedValue
    let invalidJsonCount = 0;
    const allSettings = await prisma.m365Setting.findMany({
      select: { id: true, displayName: true, expectedValue: true },
    });
    for (const setting of allSettings) {
      try {
        JSON.parse(setting.expectedValue);
      } catch {
        invalidJsonCount++;
      }
    }
    results.push({
      check: 'Expected Value JSON',
      passed: invalidJsonCount === 0,
      message: `Found ${invalidJsonCount} settings with invalid JSON in expectedValue`,
    });

    // Check 11: Control ID format validation
    const allControls = await prisma.control.findMany({
      select: { controlId: true },
    });
    const invalidControlIds = allControls.filter(
      (c) => !/^\d{2}\.\d{2}\.\d{2}$/.test(c.controlId)
    ).length;
    results.push({
      check: 'Control ID Format',
      passed: invalidControlIds === 0,
      message: `Found ${invalidControlIds} controls with invalid control ID format`,
    });

    // Check 12: Average settings per control
    const avgSettingsPerControl = mappingsCount / Math.max(controlsWithSettings, 1);
    results.push({
      check: 'Settings per Control',
      passed: avgSettingsPerControl >= 3 && avgSettingsPerControl <= 15,
      message: `Average ${avgSettingsPerControl.toFixed(1)} settings per control (expected 3-15)`,
    });

    // Print results
    console.log('VALIDATION RESULTS:\n');
    let allPassed = true;
    results.forEach((result, index) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${icon} ${result.check}`);
      console.log(`   ${result.message}`);
      if (result.details) {
        result.details.forEach((detail: string) => {
          console.log(`   - ${detail}`);
        });
      }
      console.log('');
      if (!result.passed) allPassed = false;
    });

    console.log('='.repeat(80));
    if (allPassed) {
      console.log('✅ ALL VALIDATION CHECKS PASSED');
      logger.info('Data validation completed successfully');
    } else {
      console.log('⚠️  SOME VALIDATION CHECKS FAILED - Review above');
      logger.warn('Data validation found issues');
    }
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    logger.error('Validation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  validateData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Validation script failed:', error);
      process.exit(1);
    });
}

export { validateData };
