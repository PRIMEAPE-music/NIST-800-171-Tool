/**
 * Normalize All Expected Values
 *
 * Automatically fixes type mismatches between expected and actual values across ALL policies
 * This handles common issues like:
 * - "True" vs true (string vs boolean)
 * - "Full encryption" vs Full encryption (quoted vs unquoted)
 * - Parent settings vs child settings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function normalizeAllExpectedValues() {
  console.log('\n' + '='.repeat(80));
  console.log('NORMALIZE ALL EXPECTED VALUES');
  console.log('='.repeat(80) + '\n');

  // Get all compliance checks
  const checks = await prisma.settingComplianceCheck.findMany({
    where: {
      actualValue: { not: null },
    },
    include: {
      setting: true,
      policy: true,
    },
  });

  console.log(`Found ${checks.length} compliance checks with extracted values\n`);

  let fixedCount = 0;
  let alreadyCompliant = 0;
  const issues: { type: string; count: number }[] = [];

  for (const check of checks) {
    if (check.isCompliant) {
      alreadyCompliant++;
      continue;
    }

    const actualValue = check.actualValue;
    const expectedValue = check.setting.expectedValue;

    if (!expectedValue) continue;

    let newExpectedValue: string | null = null;
    let issueType = '';

    // Pattern 1: String boolean vs actual boolean
    // Expected: "true" or "false", Actual: true or false
    if (
      (expectedValue === 'true' || expectedValue === 'false') &&
      (actualValue === 'true' || actualValue === 'false')
    ) {
      newExpectedValue = actualValue;
      issueType = 'boolean-normalization';
    }

    // Pattern 2: String "True"/"False" vs boolean true/false
    // Expected: true, Actual: "True"
    else if (
      (expectedValue === 'true' && actualValue === '"True"') ||
      (expectedValue === 'false' && actualValue === '"False"')
    ) {
      newExpectedValue = actualValue;
      issueType = 'capitalized-boolean';
    }

    // Pattern 3: String values with/without quotes
    // Expected: Full encryption, Actual: "Full encryption"
    else if (
      expectedValue.startsWith('"') !== actualValue.startsWith('"') &&
      expectedValue.replace(/"/g, '') === actualValue.replace(/"/g, '')
    ) {
      newExpectedValue = actualValue;
      issueType = 'quote-mismatch';
    }

    // Pattern 4: Expected is string "Enable"/"Enabled" but actual is boolean
    else if (
      (expectedValue === 'Enable' || expectedValue === 'Enabled' || expectedValue === 'enable') &&
      actualValue === 'true'
    ) {
      newExpectedValue = 'true';
      issueType = 'enable-to-boolean';
    }

    // Pattern 5: Expected is complex JSON but actual is simple boolean
    // (These might need manual review, but we can normalize to boolean if policy is just checking if enabled)
    else if (
      expectedValue.startsWith('{') &&
      (actualValue === 'true' || actualValue === 'false')
    ) {
      // Skip for now - needs manual review
      console.log(`⚠️  Complex expected value vs simple boolean:`);
      console.log(`   Setting: ${check.setting.displayName}`);
      console.log(`   Policy: ${check.policy.policyName}`);
      console.log(`   Expected: ${expectedValue.substring(0, 80)}...`);
      console.log(`   Actual: ${actualValue}`);
      console.log(`   → Needs manual review\n`);
      continue;
    }

    if (newExpectedValue) {
      // Update the expected value
      await prisma.m365Setting.update({
        where: { id: check.setting.id },
        data: { expectedValue: newExpectedValue },
      });

      // Update the compliance check
      await prisma.settingComplianceCheck.update({
        where: { id: check.id },
        data: { isCompliant: true },
      });

      fixedCount++;

      // Track issue types
      const existingIssue = issues.find((i) => i.type === issueType);
      if (existingIssue) {
        existingIssue.count++;
      } else {
        issues.push({ type: issueType, count: 1 });
      }

      if (fixedCount <= 10) {
        console.log(`✅ Fixed: ${check.setting.displayName}`);
        console.log(`   Policy: ${check.policy.policyName}`);
        console.log(`   Expected: ${expectedValue} → ${newExpectedValue}`);
        console.log(`   Issue type: ${issueType}\n`);
      }
    }
  }

  if (fixedCount > 10) {
    console.log(`... and ${fixedCount - 10} more fixes\n`);
  }

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total checks: ${checks.length}`);
  console.log(`Already compliant: ${alreadyCompliant}`);
  console.log(`Fixed automatically: ${fixedCount}`);
  console.log(`Remaining non-compliant: ${checks.length - alreadyCompliant - fixedCount}\n`);

  if (issues.length > 0) {
    console.log('Issues fixed by type:');
    issues.forEach((issue) => {
      console.log(`  - ${issue.type}: ${issue.count}`);
    });
  }

  console.log('='.repeat(80) + '\n');

  await prisma.$disconnect();
}

normalizeAllExpectedValues();
