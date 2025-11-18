/**
 * Phase 3 - Step 3: Test Smart Extraction
 *
 * Tests the smart extractor against real policies to verify
 * extraction strategies are working correctly
 *
 * Run with: npx tsx server/src/scripts/test-extraction.ts [policyId]
 */

import { PrismaClient } from '@prisma/client';
import { smartExtractor } from '../services/smart-extractor.service.js';

const prisma = new PrismaClient();

interface TestResult {
  policyName: string;
  templateFamily: string;
  odataType: string;
  settingsTested: number;
  successfulExtractions: number;
  failedExtractions: number;
  strategyBreakdown: Record<string, number>;
  confidenceBreakdown: Record<string, number>;
  sampleExtractions: Array<{
    setting: string;
    strategy: string;
    confidence: number;
    value: any;
    path?: string;
  }>;
}

async function testPolicyExtraction(policyId: number): Promise<TestResult> {
  // Get policy
  const policy = await prisma.m365Policy.findUnique({
    where: { id: policyId }
  });

  if (!policy) {
    throw new Error(`Policy ${policyId} not found`);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`TESTING EXTRACTION: ${policy.policyName}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Template: ${policy.odataType}`);
  console.log(`Family: ${policy.templateFamily || 'Unknown'}\n`);

  // Get relevant settings
  const settings = await prisma.m365Setting.findMany({
    where: {
      OR: [
        { policyTemplate: policy.odataType },
        { templateFamily: policy.templateFamily }
      ],
      isActive: true
    },
    take: 50 // Test with first 50 settings
  });

  console.log(`Testing ${settings.length} settings...\n`);

  // Extract values
  const results = await smartExtractor.extractBatch(policy, settings);

  // Analyze results
  let successCount = 0;
  let failCount = 0;
  const strategyBreakdown: Record<string, number> = {};
  const confidenceBreakdown: Record<string, number> = {};
  const sampleExtractions: TestResult['sampleExtractions'] = [];

  for (const [settingId, extraction] of results.entries()) {
    const setting = settings.find(s => s.id === settingId);
    if (!setting) continue;

    // Count successes/failures
    if (extraction.value !== null && extraction.strategy !== 'none') {
      successCount++;

      // Track strategy usage
      strategyBreakdown[extraction.strategy] =
        (strategyBreakdown[extraction.strategy] || 0) + 1;

      // Track confidence levels
      const confLevel = extraction.confidence >= 0.8 ? 'high' :
                       extraction.confidence >= 0.6 ? 'medium' : 'low';
      confidenceBreakdown[confLevel] = (confidenceBreakdown[confLevel] || 0) + 1;

      // Add to samples (first 10 successes)
      if (sampleExtractions.length < 10) {
        sampleExtractions.push({
          setting: setting.displayName,
          strategy: extraction.strategy,
          confidence: extraction.confidence,
          value: extraction.value,
          path: extraction.path
        });
      }
    } else {
      failCount++;
    }
  }

  const extractionRate = settings.length > 0
    ? ((successCount / settings.length) * 100).toFixed(1)
    : '0.0';

  // Print results
  console.log(`${'='.repeat(70)}`);
  console.log('EXTRACTION RESULTS');
  console.log(`${'='.repeat(70)}`);
  console.log(`Total Settings Tested:   ${settings.length}`);
  console.log(`Successful Extractions:  ${successCount} (${extractionRate}%)`);
  console.log(`Failed Extractions:      ${failCount}\n`);

  console.log('STRATEGY BREAKDOWN:');
  console.log(`${'-'.repeat(70)}`);
  for (const [strategy, count] of Object.entries(strategyBreakdown).sort((a, b) => b[1] - a[1])) {
    const percentage = ((count / successCount) * 100).toFixed(1);
    console.log(`${strategy.padEnd(25)} ${count.toString().padStart(4)} (${percentage}%)`);
  }

  console.log(`\nCONFIDENCE BREAKDOWN:`);
  console.log(`${'-'.repeat(70)}`);
  for (const [level, count] of Object.entries(confidenceBreakdown).sort((a, b) => b[1] - a[1])) {
    const percentage = ((count / successCount) * 100).toFixed(1);
    console.log(`${level.padEnd(25)} ${count.toString().padStart(4)} (${percentage}%)`);
  }

  console.log(`\nSAMPLE SUCCESSFUL EXTRACTIONS:`);
  console.log(`${'-'.repeat(70)}`);
  for (const sample of sampleExtractions) {
    console.log(`\n${sample.setting}`);
    console.log(`  Strategy:   ${sample.strategy}`);
    console.log(`  Confidence: ${(sample.confidence * 100).toFixed(0)}%`);
    console.log(`  Value:      ${JSON.stringify(sample.value)}`);
    if (sample.path) {
      console.log(`  Path:       ${sample.path}`);
    }
  }

  console.log(`\n${'='.repeat(70)}\n`);

  return {
    policyName: policy.policyName,
    templateFamily: policy.templateFamily || 'Unknown',
    odataType: policy.odataType || 'Unknown',
    settingsTested: settings.length,
    successfulExtractions: successCount,
    failedExtractions: failCount,
    strategyBreakdown,
    confidenceBreakdown,
    sampleExtractions
  };
}

async function testAllPoliciesByFamily() {
  const policies = await prisma.m365Policy.findMany({
    where: { odataType: { not: null } },
    orderBy: [
      { templateFamily: 'asc' },
      { policyName: 'asc' }
    ]
  });

  console.log(`\nTesting extraction across ${policies.length} policies...\n`);

  const resultsByFamily: Record<string, TestResult[]> = {};

  for (const policy of policies) {
    try {
      const result = await testPolicyExtraction(policy.id);
      const family = result.templateFamily;

      if (!resultsByFamily[family]) {
        resultsByFamily[family] = [];
      }
      resultsByFamily[family].push(result);

    } catch (error) {
      console.error(`Failed to test policy ${policy.id}:`, error);
    }
  }

  // Print summary by family
  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY BY TEMPLATE FAMILY');
  console.log(`${'='.repeat(70)}\n`);

  for (const [family, results] of Object.entries(resultsByFamily)) {
    const totalSettings = results.reduce((sum, r) => sum + r.settingsTested, 0);
    const totalSuccesses = results.reduce((sum, r) => sum + r.successfulExtractions, 0);
    const avgRate = totalSettings > 0
      ? ((totalSuccesses / totalSettings) * 100).toFixed(1)
      : '0.0';

    console.log(`${family}:`);
    console.log(`  Policies:    ${results.length}`);
    console.log(`  Settings:    ${totalSettings}`);
    console.log(`  Extracted:   ${totalSuccesses} (${avgRate}%)`);
    console.log('');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.length > 0 && args[0] !== '--all') {
      // Test specific policy
      const policyId = parseInt(args[0]);
      await testPolicyExtraction(policyId);
    } else if (args[0] === '--all') {
      // Test all policies
      await testAllPoliciesByFamily();
    } else {
      // Test first policy of each family
      console.log('Testing one policy from each family...\n');

      const families = await prisma.m365Policy.findMany({
        where: { templateFamily: { not: null } },
        distinct: ['templateFamily'],
        select: { templateFamily: true }
      });

      for (const { templateFamily } of families) {
        const policy = await prisma.m365Policy.findFirst({
          where: { templateFamily }
        });

        if (policy) {
          await testPolicyExtraction(policy.id);
        }
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
