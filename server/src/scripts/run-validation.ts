/**
 * Phase 3 - Step 5: Run Full System Validation
 *
 * Validates all policies using smart extraction and generates
 * a comprehensive report
 *
 * Run with: npx tsx server/src/scripts/run-validation.ts
 */

import { validateAllPolicies, getValidationSummary } from '../services/m365-validation.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runFullValidation() {
  console.log('\nStarting full system validation...\n');
  console.log('This will:');
  console.log('  1. Validate all policies using smart extraction');
  console.log('  2. Update compliance check records');
  console.log('  3. Track extraction metrics');
  console.log('  4. Generate comprehensive report\n');

  const startTime = Date.now();

  try {
    // Run validation
    const results = await validateAllPolicies();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n${'='.repeat(70)}`);
    console.log('VALIDATION COMPLETE');
    console.log(`${'='.repeat(70)}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Policies Validated: ${results.length}\n`);

    // Get summary statistics
    const summary = await getValidationSummary();

    console.log('SUMMARY BY TEMPLATE FAMILY:');
    console.log(`${'-'.repeat(70)}`);
    console.log('Family'.padEnd(25) + 'Policies'.padStart(10) + 'Settings'.padStart(12) + 'Extracted'.padStart(15) + 'Compliant'.padStart(15));
    console.log(`${'-'.repeat(70)}`);

    for (const stat of summary) {
      console.log(
        stat.templateFamily.padEnd(25) +
        stat.policyCount.toString().padStart(10) +
        stat.totalChecks.toString().padStart(12) +
        `${stat.extractedChecks} (${stat.extractionRate})`.padStart(15) +
        `${stat.compliantChecks} (${stat.complianceRate})`.padStart(15)
      );
    }

    console.log(`\n${'='.repeat(70)}\n`);

    // Export detailed results
    const fs = await import('fs/promises');
    const path = await import('path');
    const outputPath = path.join(process.cwd(), 'validation-results.json');
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`Detailed results exported to: ${outputPath}\n`);

  } catch (error) {
    console.error('Validation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runFullValidation();
