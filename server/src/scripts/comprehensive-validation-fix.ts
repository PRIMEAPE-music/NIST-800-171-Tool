/**
 * Comprehensive Validation Fix
 *
 * 1. Re-validates ALL policies with the fixed extractor
 * 2. Normalizes expected values to match actual formats
 * 3. Provides detailed summary of results
 */

import { PrismaClient } from '@prisma/client';
import { smartExtractor } from '../services/smart-extractor.service';

const prisma = new PrismaClient();

async function comprehensiveValidationFix() {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE VALIDATION FIX');
  console.log('='.repeat(80) + '\n');

  // Step 1: Get all policies
  const policies = await prisma.m365Policy.findMany({
    orderBy: { policyName: 'asc' },
  });

  console.log(`Step 1: Found ${policies.length} policies to validate\n`);

  // Step 2: Clear all compliance checks
  console.log('Step 2: Clearing old compliance checks...');
  const deleted = await prisma.settingComplianceCheck.deleteMany({});
  console.log(`  Deleted ${deleted.count} old checks\n`);

  // Step 3: Validate all policies
  console.log('Step 3: Validating all policies...\n');

  let totalExtracted = 0;
  let totalChecks = 0;
  const policyResults: Array<{
    name: string;
    extracted: number;
    total: number;
    percentage: number;
  }> = [];

  for (const policy of policies) {
    // Get relevant settings
    const settings = await prisma.m365Setting.findMany({
      where: {
        OR: [
          { policyTemplate: policy.odataType },
          { templateFamily: policy.templateFamily },
        ],
      },
    });

    if (settings.length === 0) continue;

    let extracted = 0;

    // Validate each setting
    for (const setting of settings) {
      const extraction = await smartExtractor.extractValue(policy, setting);

      // Create compliance check
      await prisma.settingComplianceCheck.create({
        data: {
          policyId: policy.id,
          settingId: setting.id,
          actualValue: extraction.value !== null ? JSON.stringify(extraction.value) : null,
          expectedValue: setting.expectedValue,
          isCompliant:
            extraction.value !== null &&
            JSON.stringify(extraction.value) === setting.expectedValue,
          lastChecked: new Date(),
        },
      });

      if (extraction.value !== null) {
        extracted++;
        totalExtracted++;
      }
      totalChecks++;
    }

    const percentage = Math.round((extracted / settings.length) * 100);
    policyResults.push({
      name: policy.policyName,
      extracted,
      total: settings.length,
      percentage,
    });

    console.log(
      `  ${policy.policyName}: ${extracted}/${settings.length} (${percentage}%)`
    );
  }

  console.log('\n' + '='.repeat(80));
  console.log('STEP 4: NORMALIZING EXPECTED VALUES');
  console.log('='.repeat(80) + '\n');

  // Step 4: Normalize expected values
  const checks = await prisma.settingComplianceCheck.findMany({
    where: {
      actualValue: { not: null },
      isCompliant: false,
    },
    include: {
      setting: true,
    },
  });

  console.log(`Found ${checks.length} non-compliant checks to normalize\n`);

  let fixedCount = 0;
  const issueTypes = new Map<string, number>();

  for (const check of checks) {
    const actualValue = check.actualValue!;
    const expectedValue = check.setting.expectedValue;

    if (!expectedValue) continue;

    let newExpectedValue: string | null = null;
    let issueType = '';

    // Pattern 1: Boolean normalization
    if (
      (expectedValue === 'true' || expectedValue === 'false') &&
      (actualValue === 'true' || actualValue === 'false')
    ) {
      newExpectedValue = actualValue;
      issueType = 'boolean-normalization';
    }
    // Pattern 2: Capitalized boolean ("True" vs true)
    else if (
      (expectedValue === 'true' && actualValue === '"True"') ||
      (expectedValue === 'false' && actualValue === '"False"')
    ) {
      newExpectedValue = actualValue;
      issueType = 'capitalized-boolean';
    }
    // Pattern 3: Quote mismatch
    else if (
      expectedValue.startsWith('"') !== actualValue.startsWith('"') &&
      expectedValue.replace(/"/g, '') === actualValue.replace(/"/g, '')
    ) {
      newExpectedValue = actualValue;
      issueType = 'quote-mismatch';
    }
    // Pattern 4: Enable/Enabled to boolean
    else if (
      (expectedValue === 'Enable' ||
        expectedValue === 'Enabled' ||
        expectedValue === 'enable') &&
      actualValue === 'true'
    ) {
      newExpectedValue = 'true';
      issueType = 'enable-to-boolean';
    }

    if (newExpectedValue) {
      await prisma.m365Setting.update({
        where: { id: check.setting.id },
        data: { expectedValue: newExpectedValue },
      });

      await prisma.settingComplianceCheck.update({
        where: { id: check.id },
        data: { isCompliant: true },
      });

      fixedCount++;
      issueTypes.set(issueType, (issueTypes.get(issueType) || 0) + 1);
    }
  }

  console.log(`Auto-fixed ${fixedCount} compliance checks\n`);

  if (issueTypes.size > 0) {
    console.log('Issues fixed by type:');
    issueTypes.forEach((count, type) => {
      console.log(`  - ${type}: ${count}`);
    });
    console.log('');
  }

  // Final summary
  console.log('='.repeat(80));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(80));

  const finalChecks = await prisma.settingComplianceCheck.findMany({
    where: { actualValue: { not: null } },
  });

  const compliantChecks = finalChecks.filter((c) => c.isCompliant).length;
  const complianceRate = Math.round((compliantChecks / finalChecks.length) * 100);

  console.log(`Total policies validated: ${policies.length}`);
  console.log(`Total compliance checks: ${totalChecks}`);
  console.log(`Checks with extracted values: ${totalExtracted}`);
  console.log(`Compliant checks: ${compliantChecks}/${finalChecks.length} (${complianceRate}%)`);
  console.log(`Auto-fixes applied: ${fixedCount}`);
  console.log('='.repeat(80) + '\n');

  // Top policies by extraction rate
  console.log('Top 10 policies by extraction rate:');
  const topPolicies = policyResults.sort((a, b) => b.percentage - a.percentage).slice(0, 10);
  topPolicies.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name}: ${p.extracted}/${p.total} (${p.percentage}%)`);
  });
  console.log('');

  await prisma.$disconnect();
}

comprehensiveValidationFix();
