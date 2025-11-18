/**
 * Phase 2 - Step 6: Analyze Categorization Results
 *
 * This script analyzes the categorization quality and provides
 * actionable insights for improvement.
 *
 * Run with: npx tsx server/src/scripts/analyze-categorization.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeCategorizationResults() {
  console.log('Analyzing categorization results...\n');

  // Get all settings with extraction hints
  const allSettings = await prisma.m365Setting.findMany({
    where: { isActive: true },
    select: {
      id: true,
      displayName: true,
      platform: true,
      templateFamily: true,
      policyTemplate: true,
      extractionHints: true
    }
  });

  // Parse extraction hints
  const settingsWithHints = allSettings.map(s => ({
    ...s,
    hints: s.extractionHints ? JSON.parse(s.extractionHints) : null
  }));

  // === OVERVIEW ===
  const categorizedSettings = settingsWithHints.filter(s => s.templateFamily !== null);
  const uncategorizedSettings = settingsWithHints.filter(s => s.templateFamily === null);

  console.log('='.repeat(70));
  console.log('CATEGORIZATION ANALYSIS REPORT');
  console.log('='.repeat(70));
  console.log('');

  console.log('OVERVIEW');
  console.log('-'.repeat(70));
  console.log(`Total Settings:        ${allSettings.length}`);
  console.log(`Categorized:           ${categorizedSettings.length} (${((categorizedSettings.length / allSettings.length) * 100).toFixed(1)}%)`);
  console.log(`Uncategorized:         ${uncategorizedSettings.length}`);
  console.log('');

  // === CONFIDENCE DISTRIBUTION ===
  const confidenceDistribution = {
    high: settingsWithHints.filter(s => s.hints?.confidence === 'high').length,
    medium: settingsWithHints.filter(s => s.hints?.confidence === 'medium').length,
    low: settingsWithHints.filter(s => s.hints?.confidence === 'low').length,
    none: settingsWithHints.filter(s => s.hints?.confidence === 'none' || !s.hints).length
  };

  console.log('CONFIDENCE DISTRIBUTION');
  console.log('-'.repeat(70));
  console.log(`High Confidence:       ${confidenceDistribution.high} (${((confidenceDistribution.high/allSettings.length)*100).toFixed(1)}%)`);
  console.log(`Medium Confidence:     ${confidenceDistribution.medium} (${((confidenceDistribution.medium/allSettings.length)*100).toFixed(1)}%)`);
  console.log(`Low Confidence:        ${confidenceDistribution.low} (${((confidenceDistribution.low/allSettings.length)*100).toFixed(1)}%)`);
  console.log(`No Match:              ${confidenceDistribution.none} (${((confidenceDistribution.none/allSettings.length)*100).toFixed(1)}%)`);
  console.log('');

  // === FAMILY DISTRIBUTION ===
  const familyGroups = categorizedSettings.reduce((acc, s) => {
    const family = s.templateFamily!;
    if (!acc[family]) {
      acc[family] = { count: 0, totalScore: 0 };
    }
    acc[family].count++;
    acc[family].totalScore += s.hints?.score || 0;
    return acc;
  }, {} as Record<string, { count: number; totalScore: number }>);

  console.log('FAMILY DISTRIBUTION');
  console.log('-'.repeat(70));
  const sortedFamilies = Object.entries(familyGroups)
    .map(([family, data]) => ({
      family,
      count: data.count,
      percentage: `${((data.count / allSettings.length) * 100).toFixed(1)}%`,
      avgScore: data.count > 0 ? +(data.totalScore / data.count).toFixed(2) : 0
    }))
    .sort((a, b) => b.count - a.count);

  for (const family of sortedFamilies) {
    console.log(`${family.family.padEnd(25)} ${family.count.toString().padStart(4)} (${family.percentage.padStart(5)})  Avg Score: ${family.avgScore}`);
  }
  console.log('');

  // === TEMPLATE COVERAGE ===
  const policies = await prisma.m365Policy.findMany({
    select: { templateFamily: true }
  });

  const policyCounts = policies.reduce((acc, p) => {
    if (p.templateFamily) {
      acc[p.templateFamily] = (acc[p.templateFamily] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  console.log('TEMPLATE COVERAGE (Settings vs Policies)');
  console.log('-'.repeat(70));
  for (const family of sortedFamilies) {
    const policyCount = policyCounts[family.family] || 0;
    const ratio = policyCount > 0 ? (family.count / policyCount).toFixed(1) : 'N/A';
    console.log(`${family.family.padEnd(25)} ${family.count} settings / ${policyCount} policies = ${ratio} settings per policy`);
  }
  console.log('');

  // === PLATFORM DISTRIBUTION ===
  const platformGroups = allSettings.reduce((acc, s) => {
    const platform = s.platform || 'Unknown';
    acc[platform] = (acc[platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('PLATFORM DISTRIBUTION');
  console.log('-'.repeat(70));
  for (const [platform, count] of Object.entries(platformGroups).sort(([,a], [,b]) => b - a)) {
    console.log(`${platform.padEnd(25)} ${count.toString().padStart(4)} (${((count/allSettings.length)*100).toFixed(1)}%)`);
  }
  console.log('');

  // === UNCATEGORIZED SETTINGS SAMPLE ===
  if (uncategorizedSettings.length > 0) {
    console.log('UNCATEGORIZED SETTINGS SAMPLE (first 20)');
    console.log('-'.repeat(70));
    for (const setting of uncategorizedSettings.slice(0, 20)) {
      console.log(`  - ${setting.displayName}`);
    }
    if (uncategorizedSettings.length > 20) {
      console.log(`  ... and ${uncategorizedSettings.length - 20} more`);
    }
    console.log('');
  }

  // === RECOMMENDATIONS ===
  console.log('RECOMMENDATIONS');
  console.log('-'.repeat(70));

  if (uncategorizedSettings.length > 0) {
    console.log(`- Review ${uncategorizedSettings.length} uncategorized settings`);
    console.log('  Add keywords to keyword-matcher.ts or manually assign families');
  }

  const lowConfCount = settingsWithHints.filter(s => s.hints?.confidence === 'low').length;
  if (lowConfCount > 50) {
    console.log(`- ${lowConfCount} low-confidence settings detected`);
    console.log('  Consider adding more specific keywords to improve matching');
  }

  const needsReviewCount = settingsWithHints.filter(s => s.hints?.needsReview).length;
  if (needsReviewCount > 0) {
    console.log(`- ${needsReviewCount} settings flagged for manual review`);
    console.log('  Review these settings to ensure correct categorization');
  }

  // Check for families with very few settings
  for (const family of sortedFamilies) {
    if (family.count < 10 && family.count > 0) {
      console.log(`- Family "${family.family}" has only ${family.count} settings`);
      console.log('  Consider if keywords are too restrictive');
    }
  }

  console.log('');
  console.log('='.repeat(70));

  await prisma.$disconnect();
}

analyzeCategorizationResults();
