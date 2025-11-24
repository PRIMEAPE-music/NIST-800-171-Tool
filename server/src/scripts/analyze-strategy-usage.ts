/**
 * Analyze Strategy Usage
 *
 * Shows which extraction strategies are being used successfully
 *
 * Run with: npx tsx server/src/scripts/analyze-strategy-usage.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeStrategies() {
  console.log('\n' + '='.repeat(80));
  console.log('EXTRACTION STRATEGY ANALYSIS');
  console.log('='.repeat(80) + '\n');

  // Get all settings with successful extractions
  const settings = await prisma.m365Setting.findMany({
    where: {
      lastSuccessfulStrategy: { not: null }
    },
    select: {
      id: true,
      displayName: true,
      lastSuccessfulStrategy: true,
      successfulExtractions: true
    }
  });

  // Count by strategy
  const strategyCounts = new Map<string, number>();
  for (const setting of settings) {
    const strategy = setting.lastSuccessfulStrategy || 'unknown';
    strategyCounts.set(strategy, (strategyCounts.get(strategy) || 0) + 1);
  }

  // Sort by count
  const sorted = Array.from(strategyCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  console.log('Strategy Usage:\n');
  for (const [strategy, count] of sorted) {
    const percentage = ((count / settings.length) * 100).toFixed(1);
    console.log(`  ${strategy.padEnd(30)} ${count.toString().padStart(4)} (${percentage}%)`);
  }

  console.log(`\nTotal settings with extractions: ${settings.length}`);

  // Show new strategy examples
  console.log('\n' + '='.repeat(80));
  console.log('NEW STRATEGY EXAMPLES');
  console.log('='.repeat(80) + '\n');

  const newStrategies = ['abbreviation-expansion', 'synonym-matching'];
  for (const strategy of newStrategies) {
    const examples = settings.filter(s => s.lastSuccessfulStrategy === strategy);
    if (examples.length > 0) {
      console.log(`\n${strategy.toUpperCase()} (${examples.length} matches):`);
      examples.slice(0, 5).forEach(s => {
        console.log(`  - ${s.displayName}`);
      });
    } else {
      console.log(`\n${strategy.toUpperCase()}: No matches yet`);
    }
  }

  await prisma.$disconnect();
}

analyzeStrategies().catch(console.error);
