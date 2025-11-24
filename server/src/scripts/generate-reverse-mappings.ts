/**
 * Generate Reverse Mappings Script
 *
 * Analyzes actual policy data to find which property names contain values
 * that match expected settings, then suggests settingName updates
 *
 * Run with: npx tsx server/src/scripts/generate-reverse-mappings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MappingSuggestion {
  settingId: number;
  settingDisplayName: string;
  currentSettingName: string | null;
  suggestedPropertyName: string;
  propertyValue: any;
  confidence: number;
  reason: string;
  policyTemplate: string;
  extractionPath: string;
}

/**
 * Score how well a property name matches a setting name
 */
function calculateMatchScore(
  propertyName: string,
  settingDisplayName: string,
  settingName: string | null
): number {
  const propLower = propertyName.toLowerCase();
  const displayLower = settingDisplayName.toLowerCase();
  const settingLower = (settingName || '').toLowerCase();

  let score = 0;

  // Exact match with current settingName (but failed extraction)
  if (settingLower && propLower === settingLower) {
    return 0; // Already tried this
  }

  // Check if property name contains key terms from display name
  const displayWords = displayLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);

  for (const word of displayWords) {
    if (propLower.includes(word)) {
      score += 20;
    }
  }

  // Check if property name is similar to current settingName
  if (settingLower) {
    const commonChars = Array.from(propLower).filter(c => settingLower.includes(c)).length;
    const similarity = commonChars / Math.max(propLower.length, settingLower.length);
    score += similarity * 30;
  }

  // Prefer camelCase properties (likely API properties)
  if (/^[a-z]+[A-Z]/.test(propertyName)) {
    score += 10;
  }

  // Boost if property contains common security terms
  const securityTerms = ['password', 'enable', 'require', 'security', 'encryption', 'minimum', 'maximum'];
  for (const term of securityTerms) {
    if (propLower.includes(term) && displayLower.includes(term)) {
      score += 15;
    }
  }

  return Math.min(score, 100);
}

/**
 * Recursively extract all property paths from an object
 */
function extractPropertyPaths(
  obj: any,
  prefix: string = '',
  maxDepth: number = 3,
  currentDepth: number = 0
): Map<string, any> {
  const paths = new Map<string, any>();

  if (currentDepth >= maxDepth || typeof obj !== 'object' || obj === null) {
    return paths;
  }

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    // Store scalar values
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value)
    ) {
      paths.set(path, value);
    }

    // Recurse into nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = extractPropertyPaths(value, path, maxDepth, currentDepth + 1);
      for (const [nestedPath, nestedValue] of nested.entries()) {
        paths.set(nestedPath, nestedValue);
      }
    }
  }

  return paths;
}

/**
 * Main analysis function
 */
async function generateReverseMappings() {
  console.log('\n' + '='.repeat(80));
  console.log('REVERSE MAPPING GENERATION');
  console.log('='.repeat(80) + '\n');

  // Get all policies with their data
  const policies = await prisma.m365Policy.findMany();

  console.log(`Analyzing ${policies.length} policies...\n`);

  // Get all settings that need better mappings
  const settings = await prisma.m365Setting.findMany({
    where: {
      isActive: true
    },
    include: {
      controlMappings: {
        select: {
          control: {
            select: {
              controlId: true,
              priority: true
            }
          }
        }
      }
    }
  });

  // Filter for settings that need mapping
  const settingsNeedingMapping = settings.filter(s =>
    s.settingName === null || s.successfulExtractions === 0
  );

  console.log(`Found ${settingsNeedingMapping.length} settings needing better mappings\n`);

  const suggestions: MappingSuggestion[] = [];

  // For each policy
  for (const policy of policies) {
    // Parse policy data
    let policyData: any;
    try {
      policyData = typeof policy.policyData === 'string'
        ? JSON.parse(policy.policyData)
        : policy.policyData;
    } catch (error) {
      console.error(`Failed to parse policy ${policy.id}:`, error);
      continue;
    }

    // Extract all property paths from this policy
    const propertyPaths = extractPropertyPaths(policyData);

    // Find relevant settings for this policy
    const relevantSettings = settingsNeedingMapping.filter(
      s =>
        s.policyTemplate === policy.odataType ||
        s.templateFamily === policy.templateFamily
    );

    // For each relevant setting
    for (const setting of relevantSettings) {
      // Try to find matching properties
      for (const [propertyPath, propertyValue] of propertyPaths.entries()) {
        // Skip null/undefined values
        if (propertyValue === null || propertyValue === undefined) {
          continue;
        }

        // Calculate match score
        const score = calculateMatchScore(
          propertyPath.split('.').pop() || propertyPath,
          setting.displayName,
          setting.settingName
        );

        // Only suggest if score is decent
        if (score >= 40) {
          const confidence = score / 100;

          suggestions.push({
            settingId: setting.id,
            settingDisplayName: setting.displayName,
            currentSettingName: setting.settingName,
            suggestedPropertyName: propertyPath,
            propertyValue: JSON.stringify(propertyValue).substring(0, 100),
            confidence,
            reason: `Found in ${policy.policyName}`,
            policyTemplate: policy.odataType || 'unknown',
            extractionPath: propertyPath
          });
        }
      }
    }
  }

  // Sort by confidence and deduplicate
  suggestions.sort((a, b) => b.confidence - a.confidence);

  // Group by setting and take best suggestion
  const bestSuggestions = new Map<number, MappingSuggestion>();
  for (const suggestion of suggestions) {
    const existing = bestSuggestions.get(suggestion.settingId);
    if (!existing || suggestion.confidence > existing.confidence) {
      bestSuggestions.set(suggestion.settingId, suggestion);
    }
  }

  // Output results
  console.log('='.repeat(80));
  console.log('SUGGESTED MAPPINGS');
  console.log('='.repeat(80) + '\n');

  const sortedSuggestions = Array.from(bestSuggestions.values())
    .sort((a, b) => b.confidence - a.confidence);

  console.log(`Total unique suggestions: ${sortedSuggestions.length}\n`);

  // High confidence (>70%)
  const highConfidence = sortedSuggestions.filter(s => s.confidence >= 0.7);
  console.log(`\n${'='.repeat(80)}`);
  console.log(`HIGH CONFIDENCE SUGGESTIONS (${highConfidence.length})`);
  console.log(`${'='.repeat(80)}\n`);

  for (const suggestion of highConfidence.slice(0, 50)) {
    console.log(`Setting: ${suggestion.settingDisplayName}`);
    console.log(`  Current: ${suggestion.currentSettingName || 'NULL'}`);
    console.log(`  Suggested: ${suggestion.suggestedPropertyName}`);
    console.log(`  Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
    console.log(`  Template: ${suggestion.policyTemplate}`);
    console.log(`  Sample Value: ${suggestion.propertyValue}`);
    console.log(`  Reason: ${suggestion.reason}`);
    console.log('');
  }

  // Medium confidence (50-70%)
  const mediumConfidence = sortedSuggestions.filter(
    s => s.confidence >= 0.5 && s.confidence < 0.7
  );
  console.log(`\n${'='.repeat(80)}`);
  console.log(`MEDIUM CONFIDENCE SUGGESTIONS (${mediumConfidence.length})`);
  console.log(`${'='.repeat(80)}\n`);

  for (const suggestion of mediumConfidence.slice(0, 30)) {
    console.log(`Setting: ${suggestion.settingDisplayName}`);
    console.log(`  Current: ${suggestion.currentSettingName || 'NULL'}`);
    console.log(`  Suggested: ${suggestion.suggestedPropertyName}`);
    console.log(`  Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
    console.log('');
  }

  // Generate SQL update script
  console.log(`\n${'='.repeat(80)}`);
  console.log('SQL UPDATE SCRIPT (High Confidence Only)');
  console.log(`${'='.repeat(80)}\n`);

  console.log('-- Review these carefully before executing!');
  console.log('-- Copy to SQLite browser or create a .sql file\n');

  for (const suggestion of highConfidence.slice(0, 50)) {
    const escapedName = suggestion.suggestedPropertyName.replace(/'/g, "''");
    console.log(
      `UPDATE M365Setting SET settingName = '${escapedName}' WHERE id = ${suggestion.settingId}; -- ${suggestion.settingDisplayName}`
    );
  }

  // Save to file for review
  console.log(`\n${'='.repeat(80)}`);
  console.log('NEXT STEPS');
  console.log(`${'='.repeat(80)}\n`);
  console.log('1. Review the high confidence suggestions above');
  console.log('2. Copy the SQL UPDATE statements you want to apply');
  console.log('3. Execute in your database (SQLite Browser or Prisma Studio)');
  console.log('4. Re-run compliance checks: npx tsx src/scripts/rebuild-compliance-checks.ts');
  console.log('5. Measure improvement: npx tsx src/scripts/final-coverage-analysis.ts');
  console.log('');

  await prisma.$disconnect();
}

generateReverseMappings().catch(console.error);
