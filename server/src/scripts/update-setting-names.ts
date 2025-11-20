import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to update M365Setting.settingName to match actual policy data property names
 *
 * Strategy:
 * 1. Extract all property names from actual policy data
 * 2. Group by policy template type
 * 3. Match to M365Settings using fuzzy matching
 * 4. Update M365Setting records with correct settingName
 */

interface PropertyMapping {
  settingId: number;
  currentName: string | null;
  proposedName: string;
  displayName: string;
  template: string;
  matchConfidence: 'exact' | 'fuzzy' | 'manual';
  controlCount: number;
}

async function updateSettingNames(dryRun = true) {
  console.log('\n' + '='.repeat(80));
  console.log('UPDATE M365SETTING NAMES TO MATCH POLICY DATA');
  console.log(dryRun ? '(DRY RUN - NO CHANGES WILL BE MADE)' : '(LIVE RUN - CHANGES WILL BE APPLIED)');
  console.log('='.repeat(80) + '\n');

  // Step 1: Collect all actual property names from policies, grouped by template
  console.log('Step 1: Analyzing policy data to extract property names...\n');

  const policies = await prisma.m365Policy.findMany({
    select: {
      id: true,
      policyName: true,
      policyType: true,
      odataType: true,
      policyData: true,
    }
  });

  // Map template -> property names
  const templateProperties = new Map<string, Set<string>>();

  for (const policy of policies) {
    if (!policy.odataType) continue;

    if (!templateProperties.has(policy.odataType)) {
      templateProperties.set(policy.odataType, new Set());
    }

    try {
      const policyData = JSON.parse(policy.policyData);
      const properties = extractAllPropertyNames(policyData);

      properties.forEach(prop => {
        templateProperties.get(policy.odataType)!.add(prop);
      });
    } catch (error) {
      // Skip invalid JSON
    }
  }

  console.log(`Found ${templateProperties.size} unique policy templates`);
  for (const [template, props] of templateProperties) {
    console.log(`  ${template}: ${props.size} properties`);
  }

  // Step 2: Get all M365Settings that need updating
  console.log('\nStep 2: Analyzing M365Settings that need updates...\n');

  const proposedMappings: PropertyMapping[] = [];

  for (const [template, availableProps] of templateProperties) {
    const settings = await prisma.m365Setting.findMany({
      where: {
        policyTemplate: template,
        isActive: true,
      },
      include: {
        controlMappings: true,
      }
    });

    console.log(`\n📋 Template: ${template}`);
    console.log(`   Settings in catalog: ${settings.length}`);
    console.log(`   Properties in policy data: ${availableProps.size}`);

    for (const setting of settings) {
      const currentName = setting.settingName;
      const proposedName = findBestMatch(currentName, setting.displayName, Array.from(availableProps));

      if (proposedName) {
        let matchConfidence: 'exact' | 'fuzzy' | 'manual' = 'exact';

        if (currentName && currentName.toLowerCase() === proposedName.toLowerCase()) {
          matchConfidence = 'exact';
        } else if (currentName && similarity(currentName, proposedName) > 0.7) {
          matchConfidence = 'fuzzy';
        } else {
          matchConfidence = 'manual';
        }

        proposedMappings.push({
          settingId: setting.id,
          currentName: currentName,
          proposedName: proposedName,
          displayName: setting.displayName,
          template: template,
          matchConfidence: matchConfidence,
          controlCount: setting.controlMappings.length,
        });
      }
    }
  }

  // Step 3: Display proposed mappings
  console.log('\n' + '='.repeat(80));
  console.log('PROPOSED MAPPINGS');
  console.log('='.repeat(80) + '\n');

  const exactMatches = proposedMappings.filter(m => m.matchConfidence === 'exact');
  const fuzzyMatches = proposedMappings.filter(m => m.matchConfidence === 'fuzzy');
  const manualMatches = proposedMappings.filter(m => m.matchConfidence === 'manual');

  console.log(`✅ Exact matches: ${exactMatches.length}`);
  console.log(`🔍 Fuzzy matches: ${fuzzyMatches.length}`);
  console.log(`⚠️  Manual review needed: ${manualMatches.length}`);
  console.log();

  // Show fuzzy matches (these need verification)
  if (fuzzyMatches.length > 0) {
    console.log('\n🔍 FUZZY MATCHES (Please review):');
    console.log('='.repeat(80));
    for (const mapping of fuzzyMatches.slice(0, 20)) {
      console.log(`\n${mapping.displayName}`);
      console.log(`  Current:  ${mapping.currentName || 'NULL'}`);
      console.log(`  Proposed: ${mapping.proposedName}`);
      console.log(`  Controls: ${mapping.controlCount}`);
    }
    if (fuzzyMatches.length > 20) {
      console.log(`\n... and ${fuzzyMatches.length - 20} more`);
    }
  }

  // Show manual matches (these definitely need review)
  if (manualMatches.length > 0) {
    console.log('\n⚠️  MANUAL REVIEW NEEDED:');
    console.log('='.repeat(80));
    for (const mapping of manualMatches.slice(0, 20)) {
      console.log(`\n${mapping.displayName}`);
      console.log(`  Current:  ${mapping.currentName || 'NULL'}`);
      console.log(`  Proposed: ${mapping.proposedName}`);
      console.log(`  Controls: ${mapping.controlCount}`);
    }
    if (manualMatches.length > 20) {
      console.log(`\n... and ${manualMatches.length - 20} more`);
    }
  }

  // Step 4: Apply updates (if not dry run)
  if (!dryRun) {
    console.log('\n' + '='.repeat(80));
    console.log('APPLYING UPDATES');
    console.log('='.repeat(80) + '\n');

    let updatedCount = 0;

    for (const mapping of proposedMappings) {
      // Only apply exact and fuzzy matches for now
      if (mapping.matchConfidence === 'exact' || mapping.matchConfidence === 'fuzzy') {
        await prisma.m365Setting.update({
          where: { id: mapping.settingId },
          data: { settingName: mapping.proposedName }
        });
        updatedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} settings`);
    console.log(`⚠️  Skipped ${manualMatches.length} settings that need manual review`);
  } else {
    console.log('\n' + '='.repeat(80));
    console.log('DRY RUN COMPLETE - No changes made');
    console.log('Run with dryRun=false to apply changes');
    console.log('='.repeat(80));
  }

  await prisma.$disconnect();
}

/**
 * Extract all property names from an object (including nested)
 */
function extractAllPropertyNames(obj: any, prefix = ''): string[] {
  const properties: string[] = [];

  if (typeof obj !== 'object' || obj === null) {
    return properties;
  }

  for (const key of Object.keys(obj)) {
    // Skip metadata fields
    if (key.startsWith('@odata')) continue;
    if (key === 'id' || key === 'createdDateTime' || key === 'lastModifiedDateTime') continue;

    const fullKey = prefix ? `${prefix}.${key}` : key;
    properties.push(fullKey);

    // Recursively get nested properties (limit depth to avoid explosion)
    if (typeof obj[key] === 'object' && obj[key] !== null && prefix.split('.').length < 2) {
      const nested = extractAllPropertyNames(obj[key], fullKey);
      properties.push(...nested);
    }
  }

  return properties;
}

/**
 * Find best matching property name from available properties
 */
function findBestMatch(currentName: string | null, displayName: string, availableProps: string[]): string | null {
  if (!availableProps.length) return null;

  // Strategy 1: Exact match with current name
  if (currentName) {
    const exactMatch = availableProps.find(prop => prop === currentName);
    if (exactMatch) return exactMatch;

    // Case-insensitive exact match
    const caseInsensitiveMatch = availableProps.find(
      prop => prop.toLowerCase() === currentName.toLowerCase()
    );
    if (caseInsensitiveMatch) return caseInsensitiveMatch;
  }

  // Strategy 2: Find property with highest similarity to current name
  if (currentName) {
    let bestMatch = availableProps[0];
    let bestScore = similarity(currentName, bestMatch);

    for (const prop of availableProps) {
      const score = similarity(currentName, prop);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = prop;
      }
    }

    if (bestScore > 0.5) {
      return bestMatch;
    }
  }

  // Strategy 3: Find property with highest similarity to display name
  let bestMatch = availableProps[0];
  let bestScore = similarity(displayName, bestMatch);

  for (const prop of availableProps) {
    const score = similarity(displayName, prop);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = prop;
    }
  }

  return bestScore > 0.3 ? bestMatch : null;
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1.toLowerCase() : s2.toLowerCase();
  const shorter = s1.length > s2.length ? s2.toLowerCase() : s1.toLowerCase();

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

// Run the script
const dryRun = process.argv.includes('--apply') ? false : true;
updateSettingNames(dryRun).catch(console.error);
