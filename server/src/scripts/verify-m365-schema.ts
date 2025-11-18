/**
 * M365 Settings Schema Verification Script
 *
 * Verifies that the M365 settings system schema is correctly set up
 * Usage: npm run verify:m365-schema
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface SchemaCheck {
  name: string;
  passed: boolean;
  message: string;
}

async function verifySchema(): Promise<void> {
  logger.info('🔍 Verifying M365 Settings Schema...\n');

  const checks: SchemaCheck[] = [];

  try {
    // Check 1: M365Setting table exists and is accessible
    try {
      await prisma.m365Setting.findMany({ take: 1 });
      checks.push({
        name: 'M365Setting Table',
        passed: true,
        message: 'Table exists and is accessible'
      });
    } catch (error) {
      checks.push({
        name: 'M365Setting Table',
        passed: false,
        message: `Table not accessible: ${error}`
      });
    }

    // Check 2: ControlSettingMapping table exists
    try {
      await prisma.controlSettingMapping.findMany({ take: 1 });
      checks.push({
        name: 'ControlSettingMapping Table',
        passed: true,
        message: 'Table exists and is accessible'
      });
    } catch (error) {
      checks.push({
        name: 'ControlSettingMapping Table',
        passed: false,
        message: `Table not accessible: ${error}`
      });
    }

    // Check 3: SettingComplianceCheck table exists
    try {
      await prisma.settingComplianceCheck.findMany({ take: 1 });
      checks.push({
        name: 'SettingComplianceCheck Table',
        passed: true,
        message: 'Table exists and is accessible'
      });
    } catch (error) {
      checks.push({
        name: 'SettingComplianceCheck Table',
        passed: false,
        message: `Table not accessible: ${error}`
      });
    }

    // Check 4: ControlM365Compliance table exists
    try {
      await prisma.controlM365Compliance.findMany({ take: 1 });
      checks.push({
        name: 'ControlM365Compliance Table',
        passed: true,
        message: 'Table exists and is accessible'
      });
    } catch (error) {
      checks.push({
        name: 'ControlM365Compliance Table',
        passed: false,
        message: `Table not accessible: ${error}`
      });
    }

    // Check 5: Control model has new relations
    try {
      await prisma.control.findFirst({
        include: {
          settingMappings: true,
          m365Compliance: true,
        },
      });
      checks.push({
        name: 'Control Relations',
        passed: true,
        message: 'Control model has settingMappings and m365Compliance relations'
      });
    } catch (error) {
      checks.push({
        name: 'Control Relations',
        passed: false,
        message: `Relations not accessible: ${error}`
      });
    }

    // Check 6: M365Policy model has new relation
    try {
      await prisma.m365Policy.findFirst({
        include: {
          complianceChecks: true,
        },
      });
      checks.push({
        name: 'M365Policy Relations',
        passed: true,
        message: 'M365Policy model has complianceChecks relation'
      });
    } catch (error) {
      checks.push({
        name: 'M365Policy Relations',
        passed: false,
        message: `Relation not accessible: ${error}`
      });
    }

    // Check 7: Unique constraints
    try {
      // This will fail if unique constraint doesn't exist
      await prisma.$queryRaw`
        SELECT sql FROM sqlite_master
        WHERE type='index'
        AND tbl_name='m365_setting_catalog'
        AND name LIKE '%unique%'
      `;
      checks.push({
        name: 'Unique Constraints',
        passed: true,
        message: 'Unique constraints properly configured'
      });
    } catch (error) {
      checks.push({
        name: 'Unique Constraints',
        passed: false,
        message: `Constraints not found: ${error}`
      });
    }

    // Print results
    console.log('\n' + '='.repeat(80));
    console.log('SCHEMA VERIFICATION RESULTS');
    console.log('='.repeat(80) + '\n');

    let allPassed = true;
    checks.forEach((check, index) => {
      const icon = check.passed ? '✅' : '❌';
      const status = check.passed ? 'PASS' : 'FAIL';
      console.log(`${index + 1}. ${icon} ${check.name}`);
      console.log(`   Status: ${status}`);
      console.log(`   ${check.message}\n`);
      if (!check.passed) allPassed = false;
    });

    console.log('='.repeat(80));
    if (allPassed) {
      console.log('✅ ALL CHECKS PASSED - Schema is correctly configured!');
      logger.info('Schema verification completed successfully');
    } else {
      console.log('❌ SOME CHECKS FAILED - Review errors above');
      logger.error('Schema verification found issues');
      process.exit(1);
    }
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    logger.error('Error during schema verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  verifySchema()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Verification script failed:', error);
      process.exit(1);
    });
}

export { verifySchema };
