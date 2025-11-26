/**
 * Build Path Mapping Table (Learning System)
 *
 * Analyzes successful extractions to build a reusable mapping table
 * that maps setting paths to actual Settings Catalog definition IDs.
 *
 * This learning system continuously improves matching by learning from
 * real extraction successes.
 *
 * Run with: npx tsx server/src/scripts/build-path-mapping-table.ts [--save]
 */

import { PrismaClient } from '@prisma/client';
import { smartExtractor } from '../services/smart-extractor.service';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface PathMapping {
  settingPath: string;
  settingDefinitionId: string;
  displayName: string;
  successCount: number;
  totalAttempts: number;
  successRate: number;
  confidence: number;
  sampleValue: any;
}

async function buildPathMappingTable(saveToFile: boolean = false) {
  console.log('\n' + '='.repeat(80));
  console.log('PATH MAPPING TABLE BUILDER (Learning System)');
  console.log('='.repeat(80));
  console.log(`Mode: ${saveToFile ? 'Save to file' : 'Display only'}`);
  console.log('='.repeat(80) + '\n');

  // Step 1: Get all Settings Catalog policies
  console.log('Step 1: Loading Settings Catalog policies...');
  const settingsCatalogPolicies = await prisma.m365Policy.findMany({
    where: {
      OR: [
        { odataType: { startsWith: '#settingsCatalog' } },
        {
          policyData: {
            contains: 'settingInstance',
          },
        },
      ],
    },
  });

  console.log(`Found ${settingsCatalogPolicies.length} Settings Catalog policies\n`);

  // Step 2: Get all active settings
  console.log('Step 2: Loading settings...');
  const settings = await prisma.m365Setting.findMany({
    where: {
      isActive: true,
    },
    orderBy: { displayName: 'asc' },
  });

  console.log(`Analyzing ${settings.length} settings\n`);

  // Step 3: Run extraction analysis
  console.log('Step 3: Running extraction analysis...');
  const pathMappings = new Map<string, PathMapping>();

  let policyCount = 0;
  for (const policy of settingsCatalogPolicies) {
    policyCount++;
    console.log(`  [${policyCount}/${settingsCatalogPolicies.length}] Analyzing: ${policy.policyName}`);

    // Extract values for all settings
    const results = await smartExtractor.extractBatch(policy, settings);

    // Analyze successful extractions
    for (const [settingId, extraction] of results.entries()) {
      const setting = settings.find((s) => s.id === settingId);
      if (!setting) continue;

      const wasSuccessful =
        extraction.value !== null &&
        extraction.strategy !== 'none' &&
        (extraction.strategy === 'settings-catalog' || extraction.strategy === 'settings-catalog-specialized');

      // Track attempts
      const key = setting.settingPath.toLowerCase();
      if (!pathMappings.has(key)) {
        pathMappings.set(key, {
          settingPath: setting.settingPath,
          settingDefinitionId: '',
          displayName: setting.displayName,
          successCount: 0,
          totalAttempts: 0,
          successRate: 0,
          confidence: 0,
          sampleValue: null,
        });
      }

      const mapping = pathMappings.get(key)!;
      mapping.totalAttempts++;

      if (wasSuccessful && extraction.path) {
        // Extract definition ID from path
        const definitionIdMatch = extraction.path.match(/\[(?:settings|catalog):\s*([^\]]+)\]/);
        if (definitionIdMatch) {
          const definitionId = definitionIdMatch[1]
            .trim()
            .replace('] (decoded)', '')
            .replace(/\(decoded from.*\)/, '')
            .trim();

          // Track the most common definition ID for this path
          if (!mapping.settingDefinitionId) {
            mapping.settingDefinitionId = definitionId;
            mapping.sampleValue = extraction.value;
          }

          mapping.successCount++;
        }
      }

      // Update success rate and confidence
      mapping.successRate = mapping.successCount / mapping.totalAttempts;
      mapping.confidence = extraction.confidence;
    }
  }

  console.log('\n');

  // Step 4: Filter and rank mappings
  console.log('Step 4: Filtering and ranking mappings...');

  const validMappings = Array.from(pathMappings.values())
    .filter((m) => m.successCount > 0 && m.settingDefinitionId) // Only include successful mappings
    .sort((a, b) => {
      // Sort by success rate, then by success count
      if (b.successRate !== a.successRate) {
        return b.successRate - a.successRate;
      }
      return b.successCount - a.successCount;
    });

  console.log(`Found ${validMappings.length} valid path mappings\n`);

  // Display summary
  const highQuality = validMappings.filter((m) => m.successRate >= 0.8);
  const mediumQuality = validMappings.filter((m) => m.successRate >= 0.5 && m.successRate < 0.8);
  const lowQuality = validMappings.filter((m) => m.successRate < 0.5);

  console.log('='.repeat(80));
  console.log('MAPPING QUALITY SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total valid mappings: ${validMappings.length}`);
  console.log(`  - High quality (≥80% success): ${highQuality.length}`);
  console.log(`  - Medium quality (50-79% success): ${mediumQuality.length}`);
  console.log(`  - Low quality (<50% success): ${lowQuality.length}`);
  console.log('='.repeat(80) + '\n');

  // Display sample mappings
  console.log('HIGH QUALITY MAPPINGS (Top 20):');
  console.log('-'.repeat(80));
  for (let i = 0; i < Math.min(20, highQuality.length); i++) {
    const m = highQuality[i];
    console.log(`\n${i + 1}. ${m.displayName}`);
    console.log(`   Path: ${m.settingPath}`);
    console.log(`   Definition ID: ${m.settingDefinitionId}`);
    console.log(`   Success Rate: ${(m.successRate * 100).toFixed(0)}% (${m.successCount}/${m.totalAttempts})`);
    console.log(`   Sample Value: ${JSON.stringify(m.sampleValue)}`);
  }
  console.log('\n');

  // Step 5: Save to file if requested
  if (saveToFile) {
    console.log('='.repeat(80));
    console.log('SAVING TO FILE');
    console.log('='.repeat(80) + '\n');

    // Create TypeScript mapping file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(process.cwd(), 'src', 'services', 'mappings');
    const outputFile = path.join(outputDir, `path-mappings-${timestamp}.ts`);

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate TypeScript code
    const tsCode = generateMappingCode(highQuality);

    // Write file
    fs.writeFileSync(outputFile, tsCode);

    console.log(`✅ Mapping table saved to: ${outputFile}`);
    console.log(`   Mappings: ${highQuality.length}`);
    console.log(`   Size: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB\n`);

    // Also save as JSON for reference
    const jsonFile = path.join(outputDir, `path-mappings-${timestamp}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(validMappings, null, 2));
    console.log(`✅ JSON reference saved to: ${jsonFile}\n`);
  } else {
    console.log('='.repeat(80));
    console.log('Use --save to export mappings to file');
    console.log('='.repeat(80) + '\n');
  }

  await prisma.$disconnect();
}

/**
 * Generate TypeScript code for the mapping table
 */
function generateMappingCode(mappings: PathMapping[]): string {
  const entries = mappings.map((m) => {
    return `  '${m.settingPath.toLowerCase()}': '${m.settingDefinitionId}', // ${m.displayName} (${(m.successRate * 100).toFixed(0)}% success)`;
  });

  return `/**
 * Path Mapping Table (Auto-generated)
 *
 * This file is automatically generated by the learning system.
 * It maps setting paths to actual Settings Catalog definition IDs
 * based on successful extraction patterns.
 *
 * Generated: ${new Date().toISOString()}
 * Mappings: ${mappings.length}
 */

export const LEARNED_PATH_MAPPINGS: Record<string, string> = {
${entries.join(',\n')}
};

/**
 * Get the learned definition ID for a setting path
 */
export function getLearnedDefinitionId(settingPath: string): string | null {
  return LEARNED_PATH_MAPPINGS[settingPath.toLowerCase()] || null;
}
`;
}

// Parse command line arguments
const args = process.argv.slice(2);
const saveToFile = args.includes('--save');

// Run the builder
buildPathMappingTable(saveToFile).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
