/**
 * Analyze and Correct M365Setting Paths
 *
 * This script:
 * 1. Runs extraction on all policies with Settings Catalog format
 * 2. Identifies which paths successfully extracted values
 * 3. Compares successful paths to current database paths
 * 4. Generates corrections and applies them
 *
 * Run with: npx tsx server/src/scripts/analyze-and-correct-paths.ts [--dry-run] [--auto-apply]
 */

import { PrismaClient } from '@prisma/client';
import { smartExtractor } from '../services/smart-extractor.service';

const prisma = new PrismaClient();

interface PathCorrection {
  settingId: number;
  displayName: string;
  currentPath: string;
  currentPathVariants: string[] | null;
  suggestedPath: string;
  suggestedVariants: string[];
  successRate: number; // How often this path worked across policies
  confidence: number; // Extraction confidence
  strategy: string;
  samplePolicyId: number;
  samplePolicyName: string;
  sampleExtractedValue: any;
  reason: string;
}

interface AnalysisResult {
  totalSettings: number;
  settingsWithCorrections: number;
  highConfidenceCorrections: number;
  mediumConfidenceCorrections: number;
  lowConfidenceCorrections: number;
  corrections: PathCorrection[];
}

async function analyzeAndCorrectPaths(dryRun: boolean = true, autoApply: boolean = false) {
  console.log('\n' + '='.repeat(80));
  console.log('PATH ANALYSIS AND CORRECTION SYSTEM');
  console.log('='.repeat(80));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE MODE'}`);
  console.log(`Auto-apply: ${autoApply ? 'YES' : 'NO (manual review required)'}`);
  console.log('='.repeat(80) + '\n');

  // Step 1: Get all Settings Catalog policies
  console.log('Step 1: Loading Settings Catalog policies...');
  const settingsCatalogPolicies = await prisma.m365Policy.findMany({
    where: {
      OR: [
        { odataType: { startsWith: '#settingsCatalog' } },
        {
          policyData: {
            contains: 'settingInstance', // Indicator of Settings Catalog format
          },
        },
      ],
    },
  });

  console.log(`Found ${settingsCatalogPolicies.length} Settings Catalog policies\n`);

  if (settingsCatalogPolicies.length === 0) {
    console.log('⚠️  No Settings Catalog policies found. Cannot perform analysis.');
    await prisma.$disconnect();
    return;
  }

  // Step 2: Get all settings that need analysis
  console.log('Step 2: Loading settings for analysis...');
  const settingsToAnalyze = await prisma.m365Setting.findMany({
    where: {
      isActive: true,
      OR: [
        { policyTemplate: { startsWith: '#settingsCatalog' } },
        { templateFamily: { in: ['DiskEncryption', 'Antivirus', 'Firewall', 'AttackSurfaceReduction'] } },
      ],
    },
    orderBy: { displayName: 'asc' },
  });

  console.log(`Analyzing ${settingsToAnalyze.length} settings\n`);

  // Step 3: Track successful extractions
  console.log('Step 3: Running extraction analysis...');
  const extractionResults = new Map<
    number,
    Array<{
      policyId: number;
      policyName: string;
      success: boolean;
      value: any;
      strategy: string;
      confidence: number;
      path: string;
    }>
  >();

  let policyCount = 0;
  for (const policy of settingsCatalogPolicies) {
    policyCount++;
    console.log(`  [${policyCount}/${settingsCatalogPolicies.length}] Analyzing: ${policy.policyName}`);

    // Extract values for all relevant settings
    const results = await smartExtractor.extractBatch(policy, settingsToAnalyze);

    // Store results
    for (const [settingId, extraction] of results.entries()) {
      if (!extractionResults.has(settingId)) {
        extractionResults.set(settingId, []);
      }

      const wasSuccessful = extraction.value !== null && extraction.strategy !== 'none';

      extractionResults.get(settingId)!.push({
        policyId: policy.id,
        policyName: policy.policyName,
        success: wasSuccessful,
        value: extraction.value,
        strategy: extraction.strategy,
        confidence: extraction.confidence,
        path: extraction.path || '',
      });
    }
  }

  console.log('\n');

  // Step 4: Analyze results and generate corrections
  console.log('Step 4: Generating path corrections...');
  const corrections: PathCorrection[] = [];

  for (const setting of settingsToAnalyze) {
    const results = extractionResults.get(setting.id) || [];

    if (results.length === 0) continue;

    // Filter successful extractions
    const successful = results.filter((r) => r.success);

    if (successful.length === 0) continue;

    // Calculate success rate
    const successRate = successful.length / results.length;

    // Find most common successful strategy and path
    const strategyCounts = new Map<string, number>();
    const pathCounts = new Map<string, { count: number; sampleResult: any }>();

    for (const result of successful) {
      strategyCounts.set(result.strategy, (strategyCounts.get(result.strategy) || 0) + 1);

      if (!pathCounts.has(result.path)) {
        pathCounts.set(result.path, { count: 0, sampleResult: result });
      }
      pathCounts.get(result.path)!.count++;
    }

    // Get best strategy and path
    const bestStrategy = Array.from(strategyCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    const bestPath = Array.from(pathCounts.entries()).sort((a, b) => b[1].count - a[1].count)[0];

    if (!bestStrategy || !bestPath) continue;

    const sampleResult = bestPath[1].sampleResult;

    // Extract the actual path from the extraction result
    let suggestedPath = extractPathFromExtractionResult(sampleResult.path, sampleResult.strategy);

    // Check if this is different from current path
    const needsCorrection =
      suggestedPath !== setting.settingPath &&
      suggestedPath !== 'unknown' &&
      successRate > 0.3; // At least 30% success rate

    if (needsCorrection) {
      // Generate path variants from all successful extractions
      const uniquePaths = new Set(
        successful
          .map((r) => extractPathFromExtractionResult(r.path, r.strategy))
          .filter((p) => p !== 'unknown' && p !== suggestedPath)
      );

      const avgConfidence = successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length;

      corrections.push({
        settingId: setting.id,
        displayName: setting.displayName,
        currentPath: setting.settingPath,
        currentPathVariants: setting.pathVariants ? JSON.parse(setting.pathVariants) : null,
        suggestedPath,
        suggestedVariants: Array.from(uniquePaths),
        successRate,
        confidence: avgConfidence,
        strategy: bestStrategy[0],
        samplePolicyId: sampleResult.policyId,
        samplePolicyName: sampleResult.policyName,
        sampleExtractedValue: sampleResult.value,
        reason: determineReason(setting.settingPath, suggestedPath, sampleResult.strategy),
      });
    }
  }

  console.log(`Generated ${corrections.length} path corrections\n`);

  // Step 5: Categorize corrections by confidence
  const highConfidence = corrections.filter((c) => c.confidence >= 0.8 && c.successRate >= 0.7);
  const mediumConfidence = corrections.filter(
    (c) => c.confidence >= 0.6 && c.successRate >= 0.5 && !highConfidence.includes(c)
  );
  const lowConfidence = corrections.filter(
    (c) => !highConfidence.includes(c) && !mediumConfidence.includes(c)
  );

  const analysis: AnalysisResult = {
    totalSettings: settingsToAnalyze.length,
    settingsWithCorrections: corrections.length,
    highConfidenceCorrections: highConfidence.length,
    mediumConfidenceCorrections: mediumConfidence.length,
    lowConfidenceCorrections: lowConfidence.length,
    corrections: corrections.sort((a, b) => b.confidence - a.confidence),
  };

  // Display summary
  console.log('='.repeat(80));
  console.log('ANALYSIS SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total settings analyzed: ${analysis.totalSettings}`);
  console.log(`Settings needing corrections: ${analysis.settingsWithCorrections}`);
  console.log(`  - High confidence (≥80%, ≥70% success): ${analysis.highConfidenceCorrections}`);
  console.log(`  - Medium confidence (≥60%, ≥50% success): ${analysis.mediumConfidenceCorrections}`);
  console.log(`  - Low confidence: ${analysis.lowConfidenceCorrections}`);
  console.log('='.repeat(80) + '\n');

  // Display corrections
  if (corrections.length > 0) {
    displayCorrections(highConfidence, 'HIGH CONFIDENCE CORRECTIONS', true);
    displayCorrections(mediumConfidence, 'MEDIUM CONFIDENCE CORRECTIONS', true);
    displayCorrections(lowConfidence, 'LOW CONFIDENCE CORRECTIONS (Review Required)', false);
  }

  // Step 6: Apply corrections
  if (!dryRun) {
    console.log('\n' + '='.repeat(80));
    console.log('APPLYING CORRECTIONS');
    console.log('='.repeat(80) + '\n');

    const correctionsToApply = autoApply
      ? corrections
      : highConfidence; // Only apply high confidence in non-auto mode

    await applyCorrections(correctionsToApply);

    console.log('\n✅ Corrections applied successfully!\n');
  } else {
    console.log('\n' + '='.repeat(80));
    console.log('DRY RUN - No changes made');
    console.log('Run with --apply to apply high-confidence corrections');
    console.log('Run with --apply --auto-apply to apply all corrections');
    console.log('='.repeat(80) + '\n');
  }

  await prisma.$disconnect();
}

/**
 * Extract the actual property path from extraction result
 */
function extractPathFromExtractionResult(pathString: string, strategy: string): string {
  // Settings Catalog format: "[settings: device_vendor_msft_...]"
  if (pathString.includes('[settings:')) {
    const match = pathString.match(/\[settings:\s*([^\]]+)\]/);
    if (match) {
      return match[1].trim().replace('] (decoded)', '').replace('] (decoded from', '').split(')')[0].trim();
    }
  }

  // Catalog format: "[catalog: device_vendor_msft_...]"
  if (pathString.includes('[catalog:')) {
    const match = pathString.match(/\[catalog:\s*([^\]]+)\]/);
    if (match) {
      return match[1].trim();
    }
  }

  // Direct path format
  if (pathString.includes('[found at:')) {
    const match = pathString.match(/\[found at:\s*([^\]]+)\]/);
    if (match) {
      return match[1].trim();
    }
  }

  // OMA-URI format
  if (pathString.includes('OMA-URI:')) {
    return pathString;
  }

  // If we can't extract a clear path, return the strategy as a hint
  return 'unknown';
}

/**
 * Determine the reason for the correction
 */
function determineReason(currentPath: string, suggestedPath: string, strategy: string): string {
  if (currentPath.includes('.') && !suggestedPath.includes('.')) {
    return 'Current path uses nested notation, actual path is flat (Settings Catalog format)';
  }

  if (strategy === 'settings-catalog' || strategy === 'settings-catalog-specialized') {
    return 'Settings Catalog uses definition IDs instead of property paths';
  }

  if (strategy === 'oma-uri') {
    return 'Setting is configured via OMA-URI custom profile';
  }

  if (currentPath.toLowerCase() !== suggestedPath.toLowerCase() &&
      currentPath.replace(/[._-]/g, '') === suggestedPath.replace(/[._-]/g, '')) {
    return 'Case or separator mismatch';
  }

  return 'Path structure mismatch - actual policy uses different format';
}

/**
 * Display corrections in a readable format
 */
function displayCorrections(corrections: PathCorrection[], title: string, showDetails: boolean) {
  if (corrections.length === 0) return;

  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80) + '\n');

  for (let i = 0; i < corrections.length; i++) {
    const c = corrections[i];

    console.log(`${i + 1}. ${c.displayName}`);
    console.log(`   Current Path: ${c.currentPath}`);
    console.log(`   Suggested Path: ${c.suggestedPath}`);
    console.log(`   Success Rate: ${(c.successRate * 100).toFixed(0)}%`);
    console.log(`   Confidence: ${(c.confidence * 100).toFixed(0)}%`);
    console.log(`   Strategy: ${c.strategy}`);

    if (showDetails) {
      console.log(`   Reason: ${c.reason}`);
      console.log(`   Sample Policy: ${c.samplePolicyName}`);
      console.log(`   Sample Value: ${JSON.stringify(c.sampleExtractedValue)}`);

      if (c.suggestedVariants.length > 0) {
        console.log(`   Path Variants: ${c.suggestedVariants.slice(0, 3).join(', ')}${c.suggestedVariants.length > 3 ? '...' : ''}`);
      }
    }

    console.log('');
  }
}

/**
 * Apply corrections to the database
 */
async function applyCorrections(corrections: PathCorrection[]) {
  console.log(`Applying ${corrections.length} corrections...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const correction of corrections) {
    try {
      // Build update data
      const updateData: any = {
        settingPath: correction.suggestedPath,
      };

      // Add path variants if we found multiple successful paths
      if (correction.suggestedVariants.length > 0) {
        // Merge with existing variants
        const existingVariants = correction.currentPathVariants || [];
        const allVariants = Array.from(
          new Set([...existingVariants, ...correction.suggestedVariants])
        );

        updateData.pathVariants = JSON.stringify(allVariants);
      }

      // Update the setting
      await prisma.m365Setting.update({
        where: { id: correction.settingId },
        data: updateData,
      });

      console.log(`✅ Updated: ${correction.displayName}`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Failed to update ${correction.displayName}: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\nResults: ${successCount} successful, ${failCount} failed`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');
const autoApply = args.includes('--auto-apply');

// Run the analysis
analyzeAndCorrectPaths(dryRun, autoApply).catch((error) => {
  console.error('Analysis failed:', error);
  process.exit(1);
});
