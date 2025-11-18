/**
 * Phase 2 - Step 2: Categorize M365 Settings by Template
 *
 * This script analyzes all M365Setting records and categorizes them
 * by policy template family using intelligent keyword matching.
 *
 * Run with: npx tsx server/src/scripts/categorize-settings.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  CATEGORY_DEFINITIONS,
  findBestCategory,
  extractPlatform,
  normalizeDisplayName
} from '../utils/keyword-matcher.js';

const prisma = new PrismaClient();

interface CategorizationResult {
  settingId: number;
  displayName: string;
  assignedFamily: string | null;
  assignedTemplate: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  score: number;
  matchedKeywords: string[];
  needsReview: boolean;
}

interface CategorizationStats {
  total: number;
  categorized: number;
  uncategorized: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  needsManualReview: number;
  byFamily: Record<string, number>;
}

async function categorizeSettings(
  dryRun: boolean = false
): Promise<CategorizationResult[]> {
  console.log('Starting M365 settings categorization...\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no database changes)' : 'LIVE (will update database)'}\n`);

  // Get all active settings
  const settings = await prisma.m365Setting.findMany({
    where: { isActive: true },
    orderBy: { displayName: 'asc' }
  });

  console.log(`Found ${settings.length} active settings to categorize\n`);

  const results: CategorizationResult[] = [];
  const stats: CategorizationStats = {
    total: settings.length,
    categorized: 0,
    uncategorized: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    needsManualReview: 0,
    byFamily: {}
  };

  for (const setting of settings) {
    // Extract or normalize platform
    const platform = extractPlatform(
      setting.displayName,
      setting.description,
      setting.platform
    );

    // Find best matching category
    const { category, match, alternatives } = findBestCategory(
      setting.displayName,
      setting.description,
      platform
    );

    // Determine if needs manual review
    const needsReview =
      match.confidence === 'none' ||
      match.confidence === 'low' ||
      (alternatives.length > 0 && alternatives[0].match.score >= match.score * 0.8);

    // Prepare result
    const result: CategorizationResult = {
      settingId: setting.id,
      displayName: setting.displayName,
      assignedFamily: category?.family || null,
      assignedTemplate: category?.templates[0] || null, // Use primary template
      confidence: match.confidence,
      score: match.score,
      matchedKeywords: match.matchedKeywords,
      needsReview
    };

    results.push(result);

    // Update statistics
    if (category) {
      stats.categorized++;
      stats.byFamily[category.family] = (stats.byFamily[category.family] || 0) + 1;

      if (match.confidence === 'high') stats.highConfidence++;
      if (match.confidence === 'medium') stats.mediumConfidence++;
      if (match.confidence === 'low') stats.lowConfidence++;
    } else {
      stats.uncategorized++;
    }

    if (needsReview) {
      stats.needsManualReview++;
    }

    // Update database (unless dry run)
    if (!dryRun && category) {
      await prisma.m365Setting.update({
        where: { id: setting.id },
        data: {
          templateFamily: category.family,
          policyTemplate: category.templates[0], // Primary template
          extractionHints: JSON.stringify({
            confidence: match.confidence,
            score: match.score,
            matchedKeywords: match.matchedKeywords,
            alternatives: alternatives.map(alt => ({
              family: alt.category.family,
              score: alt.match.score
            })),
            categorizedAt: new Date().toISOString(),
            needsReview
          })
        }
      });
    }

    // Log progress every 50 settings
    if (results.length % 50 === 0) {
      console.log(`  Processed ${results.length}/${settings.length} settings...`);
    }
  }

  console.log(`\nCategorization complete!\n`);

  // Print summary statistics
  printStatistics(stats);

  // Print needs review list
  if (stats.needsManualReview > 0) {
    printNeedsReview(results.filter(r => r.needsReview));
  }

  // Print family breakdown
  printFamilyBreakdown(results, stats);

  return results;
}

function printStatistics(stats: CategorizationStats) {
  console.log('='.repeat(70));
  console.log('CATEGORIZATION STATISTICS');
  console.log('='.repeat(70));
  console.log(`Total settings:          ${stats.total}`);
  console.log(`Categorized:             ${stats.categorized} (${((stats.categorized/stats.total)*100).toFixed(1)}%)`);
  console.log(`Uncategorized:           ${stats.uncategorized} (${((stats.uncategorized/stats.total)*100).toFixed(1)}%)`);
  console.log('');
  console.log('Confidence Distribution:');
  console.log(`  High confidence:       ${stats.highConfidence} (${((stats.highConfidence/stats.total)*100).toFixed(1)}%)`);
  console.log(`  Medium confidence:     ${stats.mediumConfidence} (${((stats.mediumConfidence/stats.total)*100).toFixed(1)}%)`);
  console.log(`  Low confidence:        ${stats.lowConfidence} (${((stats.lowConfidence/stats.total)*100).toFixed(1)}%)`);
  console.log('');
  console.log(`Needs manual review:     ${stats.needsManualReview} (${((stats.needsManualReview/stats.total)*100).toFixed(1)}%)`);
  console.log('');
}

function printFamilyBreakdown(
  results: CategorizationResult[],
  stats: CategorizationStats
) {
  console.log('='.repeat(70));
  console.log('SETTINGS BY TEMPLATE FAMILY');
  console.log('='.repeat(70));

  // Sort families by count
  const sortedFamilies = Object.entries(stats.byFamily)
    .sort(([, a], [, b]) => b - a);

  for (const [family, count] of sortedFamilies) {
    const familySettings = results.filter(r => r.assignedFamily === family);
    const highConf = familySettings.filter(r => r.confidence === 'high').length;
    const medConf = familySettings.filter(r => r.confidence === 'medium').length;
    const lowConf = familySettings.filter(r => r.confidence === 'low').length;
    const needsReview = familySettings.filter(r => r.needsReview).length;

    console.log(`\n${family}: ${count} settings`);
    console.log(`  High: ${highConf} | Medium: ${medConf} | Low: ${lowConf}`);
    if (needsReview > 0) {
      console.log(`  Needs review: ${needsReview}`);
    }
  }

  if (stats.uncategorized > 0) {
    console.log(`\nUncategorized: ${stats.uncategorized} settings`);
  }

  console.log('');
}

function printNeedsReview(needsReview: CategorizationResult[]) {
  console.log('='.repeat(70));
  console.log('SETTINGS NEEDING MANUAL REVIEW');
  console.log('='.repeat(70));
  console.log(`Total: ${needsReview.length} settings\n`);

  // Group by assigned family
  const byFamily = needsReview.reduce((acc, result) => {
    const family = result.assignedFamily || 'Uncategorized';
    if (!acc[family]) acc[family] = [];
    acc[family].push(result);
    return acc;
  }, {} as Record<string, CategorizationResult[]>);

  for (const [family, results] of Object.entries(byFamily)) {
    console.log(`\n${family} (${results.length}):`);
    console.log('-'.repeat(70));

    // Show top 10 per family
    const toShow = results.slice(0, 10);
    for (const result of toShow) {
      console.log(`  [Score: ${result.score}] ${result.displayName}`);
      if (result.matchedKeywords.length > 0) {
        console.log(`    Keywords: ${result.matchedKeywords.join(', ')}`);
      }
    }

    if (results.length > 10) {
      console.log(`  ... and ${results.length - 10} more`);
    }
  }

  console.log('');
}

// Export categorization results to JSON for review
async function exportResults(results: CategorizationResult[]) {
  const fs = await import('fs/promises');
  const path = await import('path');

  const outputPath = path.join(process.cwd(), 'categorization-results.json');

  await fs.writeFile(
    outputPath,
    JSON.stringify(results, null, 2),
    'utf-8'
  );

  console.log(`Detailed results exported to: ${outputPath}\n`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const exportJson = args.includes('--export');

  try {
    const results = await categorizeSettings(dryRun);

    if (exportJson) {
      await exportResults(results);
    }

    if (dryRun) {
      console.log('This was a dry run. To apply changes, run without --dry-run flag.');
      console.log('   Example: npx tsx server/src/scripts/categorize-settings.ts\n');
    } else {
      console.log('Database updated with categorization results!\n');
    }

  } catch (error) {
    console.error('Categorization failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
