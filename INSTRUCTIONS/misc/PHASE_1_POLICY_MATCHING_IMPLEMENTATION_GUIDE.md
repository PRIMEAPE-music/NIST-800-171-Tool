# Phase 1: Policy Matching Quick Wins - Implementation Guide

**Objective:** Increase policy-to-control matching from 5.5% to 15-20%  
**Time Estimate:** 2-3 hours  
**Difficulty:** ⭐ Low  
**Expected Improvement:** +10-15% match rate

---

## Overview

Phase 1 implements three quick-win approaches:
1. **Add Pattern-Based Matching Strategies** (30-45 min) - Abbreviation expansion and synonym matching
2. **Generate & Apply Reverse Mappings** (60-90 min) - Learn from actual policy data
3. **Test & Measure Results** (30 min) - Validate improvements

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Add Pattern-Based Strategies](#step-1-add-pattern-based-strategies)
3. [Step 2: Create Reverse Mapping Script](#step-2-create-reverse-mapping-script)
4. [Step 3: Review & Apply Suggestions](#step-3-review--apply-suggestions)
5. [Step 4: Test & Measure](#step-4-test--measure)
6. [Verification & Rollback](#verification--rollback)

---

## Prerequisites

### Current State Verification

Before starting, verify your current baseline:

```bash
cd server
npx tsx src/scripts/rebuild-compliance-checks.ts
npx tsx src/scripts/final-coverage-analysis.ts
```

**Document your baseline metrics:**
- Current match rate: ____%
- Settings with extracted values: _____
- Unique controls covered: _____

### Required Files

Ensure these files exist:
- ✅ `server/src/services/smart-extractor.service.ts` (existing)
- ✅ `server/src/services/m365-validation.service.ts` (existing)
- ✅ `server/src/scripts/rebuild-compliance-checks.ts` (existing)
- ✅ `server/src/scripts/final-coverage-analysis.ts` (existing)

---

## Step 1: Add Pattern-Based Strategies

### 1.1 Update Smart Extractor Service

**File:** `server/src/services/smart-extractor.service.ts`

**Location:** Add helper functions BEFORE the strategy definitions (around line 60)

#### Add Abbreviation Expansion Helper

📁 File: `server/src/services/smart-extractor.service.ts`

➕ ADD AFTER: `// ===== HELPER FUNCTIONS =====` section (or create this section before strategies)

```typescript
// ===== PATTERN MATCHING HELPERS =====

/**
 * Abbreviation dictionary for common M365/security terms
 */
const ABBREVIATIONS: Record<string, string[]> = {
  'pwd': ['password', 'passwd'],
  'pswd': ['password'],
  'min': ['minimum', 'minimized'],
  'max': ['maximum', 'maximized'],
  'auth': ['authentication', 'authorization', 'authorized'],
  'config': ['configuration', 'configured', 'configure'],
  'req': ['required', 'require', 'requirement'],
  'mgmt': ['management', 'manage'],
  'svc': ['service'],
  'admin': ['administrator', 'administration'],
  'sec': ['security', 'secure'],
  'pol': ['policy'],
  'num': ['number'],
  'len': ['length'],
  'exp': ['expiration', 'expire', 'expires'],
  'prot': ['protection', 'protect'],
  'encr': ['encryption', 'encrypted', 'encrypt'],
  'def': ['defender', 'defense'],
  'av': ['antivirus'],
  'fw': ['firewall'],
  'cond': ['conditional', 'condition']
};

/**
 * Generate all possible expansions of abbreviations in a setting name
 */
function expandAbbreviations(settingName: string): string[] {
  const variations: string[] = [settingName];
  const lowerName = settingName.toLowerCase();

  for (const [abbr, expansions] of Object.entries(ABBREVIATIONS)) {
    // Check if abbreviation appears as a whole word or part of camelCase
    const regex = new RegExp(`\\b${abbr}\\b|(?<=[a-z])${abbr}(?=[A-Z])|^${abbr}(?=[A-Z])`, 'gi');
    
    if (regex.test(lowerName)) {
      for (const expansion of expansions) {
        // Try each expansion
        const expanded = settingName.replace(
          new RegExp(abbr, 'gi'), 
          (match) => {
            // Preserve original casing pattern
            if (match === match.toUpperCase()) return expansion.toUpperCase();
            if (match[0] === match[0].toUpperCase()) {
              return expansion.charAt(0).toUpperCase() + expansion.slice(1);
            }
            return expansion.toLowerCase();
          }
        );
        
        if (expanded !== settingName) {
          variations.push(expanded);
        }
      }
    }
  }

  return [...new Set(variations)]; // Remove duplicates
}

/**
 * Synonym dictionary for common setting terms
 */
const SYNONYMS: Record<string, string[]> = {
  'required': ['enabled', 'enforce', 'mandatory', 'must'],
  'blocked': ['disabled', 'prevent', 'deny', 'disallow'],
  'allowed': ['enabled', 'permit', 'authorize', 'allow'],
  'minimum': ['min', 'least', 'lowest'],
  'maximum': ['max', 'most', 'highest'],
  'enable': ['require', 'enforce', 'allow'],
  'disable': ['block', 'prevent', 'deny'],
  'enforce': ['require', 'mandatory'],
  'password': ['pwd', 'passcode', 'pin'],
  'length': ['size', 'len'],
  'complexity': ['strength', 'complex'],
  'expiration': ['expire', 'expires', 'expiry'],
  'storage': ['data', 'disk'],
  'device': ['endpoint', 'machine'],
  'user': ['account', 'identity'],
  'admin': ['administrator'],
  'security': ['protection', 'secure']
};

/**
 * Generate synonym variations of a setting name
 */
function getSynonymVariations(settingName: string): string[] {
  const variations: string[] = [settingName];
  const lowerName = settingName.toLowerCase();

  for (const [word, synonyms] of Object.entries(SYNONYMS)) {
    const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
    
    if (wordRegex.test(lowerName)) {
      for (const synonym of synonyms) {
        const replaced = settingName.replace(
          wordRegex,
          (match) => {
            // Preserve original casing
            if (match[0] === match[0].toUpperCase()) {
              return synonym.charAt(0).toUpperCase() + synonym.slice(1);
            }
            return synonym.toLowerCase();
          }
        );
        
        if (replaced !== settingName) {
          variations.push(replaced);
        }
      }
    }
  }

  return [...new Set(variations)]; // Remove duplicates
}
```

#### Add Strategy 8: Abbreviation Expansion

📁 File: `server/src/services/smart-extractor.service.ts`

➕ ADD AFTER: `settingsCatalogDeepStrategy` definition (around line 280)

```typescript
/**
 * Strategy 8: Abbreviation Expansion
 * Expand common abbreviations in property names
 * Example: 'pwdMinLen' -> 'passwordMinimumLength'
 */
const abbreviationExpansionStrategy: ExtractionStrategy = {
  name: 'abbreviation-expansion',
  priority: 8,
  description: 'Expand abbreviations in setting path',
  extract: (policyData, setting) => {
    const propertyName = setting.settingPath.split('.').pop();
    const variations = expandAbbreviations(propertyName);

    // Try each variation in the policy data
    for (const variation of variations) {
      // Try direct property access
      if (policyData[variation] !== undefined && policyData[variation] !== null) {
        return {
          value: policyData[variation],
          strategy: 'abbreviation-expansion',
          confidence: 0.65,
          path: `${propertyName} -> ${variation}`
        };
      }

      // Try nested access (one level deep)
      for (const key of Object.keys(policyData)) {
        if (typeof policyData[key] === 'object' && policyData[key] !== null) {
          if (policyData[key][variation] !== undefined && policyData[key][variation] !== null) {
            return {
              value: policyData[key][variation],
              strategy: 'abbreviation-expansion',
              confidence: 0.60,
              path: `${key}.${variation}`
            };
          }
        }
      }
    }

    return null;
  }
};
```

#### Add Strategy 9: Synonym Matching

📁 File: `server/src/services/smart-extractor.service.ts`

➕ ADD AFTER: `abbreviationExpansionStrategy` definition

```typescript
/**
 * Strategy 9: Synonym Matching
 * Replace words with synonyms to find property names
 * Example: 'passwordRequired' -> 'passwordEnabled'
 */
const synonymMatchingStrategy: ExtractionStrategy = {
  name: 'synonym-matching',
  priority: 9,
  description: 'Try synonym variations of setting terms',
  extract: (policyData, setting) => {
    const propertyName = setting.settingPath.split('.').pop();
    const variations = getSynonymVariations(propertyName);

    // Try each variation
    for (const variation of variations) {
      // Try direct property access
      if (policyData[variation] !== undefined && policyData[variation] !== null) {
        return {
          value: policyData[variation],
          strategy: 'synonym-matching',
          confidence: 0.55,
          path: `${propertyName} -> ${variation}`
        };
      }

      // Try nested access (one level deep)
      for (const key of Object.keys(policyData)) {
        if (typeof policyData[key] === 'object' && policyData[key] !== null) {
          if (policyData[key][variation] !== undefined && policyData[key][variation] !== null) {
            return {
              value: policyData[key][variation],
              strategy: 'synonym-matching',
              confidence: 0.50,
              path: `${key}.${variation}`
            };
          }
        }
      }
    }

    return null;
  }
};
```

#### Update Strategy Array

📁 File: `server/src/services/smart-extractor.service.ts`

🔍 FIND: 
```typescript
  private strategies: ExtractionStrategy[] = [
    exactPathStrategy,
    stripPrefixStrategy,
    directPropertyStrategy,
    camelCaseVariantsStrategy,
    shallowSearchStrategy,
    settingsCatalogStrategy,
    settingsCatalogDeepStrategy
  ];
```

✏️ REPLACE WITH:
```typescript
  private strategies: ExtractionStrategy[] = [
    exactPathStrategy,
    stripPrefixStrategy,
    directPropertyStrategy,
    camelCaseVariantsStrategy,
    shallowSearchStrategy,
    settingsCatalogStrategy,
    settingsCatalogDeepStrategy,
    abbreviationExpansionStrategy,
    synonymMatchingStrategy
  ];
```

### 1.2 Verify Syntax

```bash
cd server
npx tsc --noEmit src/services/smart-extractor.service.ts
```

**Expected:** No errors

---

## Step 2: Create Reverse Mapping Script

This script analyzes your actual policy data to discover which property names successfully extract values, then suggests updates to your M365Setting.settingName fields.

### 2.1 Create the Script

📁 File: `server/src/scripts/generate-reverse-mappings.ts`

🔄 COMPLETE FILE:
```typescript
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
    const commonChars = [...propLower].filter(c => settingLower.includes(c)).length;
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
  const policies = await prisma.m365Policy.findMany({
    where: {
      odataType: { not: null },
      policyData: { not: null }
    }
  });

  console.log(`Analyzing ${policies.length} policies...\n`);

  // Get all settings that need better mappings
  const settings = await prisma.m365Setting.findMany({
    where: {
      isActive: true,
      OR: [
        { settingName: null },
        {
          // Settings that have a name but no successful extractions
          settingName: { not: null },
          successfulExtractions: 0
        }
      ]
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

  console.log(`Found ${settings.length} settings needing better mappings\n`);

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
    const relevantSettings = settings.filter(
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
```

### 2.2 Run the Script

```bash
cd server
npx tsx src/scripts/generate-reverse-mappings.ts > reverse-mapping-suggestions.txt
```

This creates a file with all suggestions that you can review.

---

## Step 3: Review & Apply Suggestions

### 3.1 Review High Confidence Suggestions

Open the output file:
```bash
cat reverse-mapping-suggestions.txt
```

**Review criteria:**
- ✅ Confidence > 70% → Safe to apply
- ⚠️ Confidence 50-70% → Review manually
- ❌ Confidence < 50% → Skip for now

### 3.2 Apply High Confidence Mappings

**Option A: Using SQL (Recommended for bulk)**

1. Open your database in DB Browser for SQLite or Prisma Studio
2. Copy the SQL UPDATE statements from the output
3. Execute them in a transaction:

```sql
BEGIN TRANSACTION;

-- Paste the UPDATE statements here
UPDATE M365Setting SET settingName = 'passwordMinimumLength' WHERE id = 123;
UPDATE M365Setting SET settingName = 'passwordRequired' WHERE id = 456;
-- ... etc

COMMIT;
```

**Option B: Create a Bulk Update Script**

📁 File: `server/src/scripts/apply-reverse-mappings.ts`

🔄 COMPLETE FILE:
```typescript
/**
 * Apply Reverse Mappings Script
 *
 * Applies the high-confidence mapping suggestions to the database
 *
 * IMPORTANT: Review the mappings array carefully before running!
 *
 * Run with: npx tsx server/src/scripts/apply-reverse-mappings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Manual mappings to apply
 * ADD YOUR HIGH-CONFIDENCE SUGGESTIONS HERE
 */
const mappings: Array<{
  settingId: number;
  settingName: string;
  displayName: string; // For verification only
}> = [
  // EXAMPLE - Replace with your actual suggestions:
  // { settingId: 123, settingName: 'passwordMinimumLength', displayName: 'Password Minimum Length' },
  // { settingId: 456, settingName: 'passwordRequired', displayName: 'Require Password' },
  
  // ADD YOUR MAPPINGS HERE FROM generate-reverse-mappings.ts OUTPUT
  
];

async function applyMappings() {
  console.log('\n' + '='.repeat(80));
  console.log('APPLYING REVERSE MAPPINGS');
  console.log('='.repeat(80) + '\n');

  console.log(`Applying ${mappings.length} mappings...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const mapping of mappings) {
    try {
      // Verify setting exists
      const setting = await prisma.m365Setting.findUnique({
        where: { id: mapping.settingId },
        select: { id: true, displayName: true, settingName: true }
      });

      if (!setting) {
        console.log(`❌ Setting ${mapping.settingId} not found`);
        errorCount++;
        continue;
      }

      // Verify display name matches (safety check)
      if (setting.displayName !== mapping.displayName) {
        console.log(`⚠️  Display name mismatch for setting ${mapping.settingId}:`);
        console.log(`   Expected: ${mapping.displayName}`);
        console.log(`   Found: ${setting.displayName}`);
        console.log(`   Skipping for safety...`);
        errorCount++;
        continue;
      }

      // Apply update
      await prisma.m365Setting.update({
        where: { id: mapping.settingId },
        data: { settingName: mapping.settingName }
      });

      console.log(`✓ ${setting.displayName}`);
      console.log(`  ${setting.settingName || 'NULL'} → ${mapping.settingName}`);
      successCount++;

    } catch (error) {
      console.error(`❌ Failed to update setting ${mapping.settingId}:`, error);
      errorCount++;
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('RESULTS');
  console.log(`${'='.repeat(80)}`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Total: ${mappings.length}`);
  console.log('');

  if (successCount > 0) {
    console.log('✓ Mappings applied successfully!');
    console.log('\nNext steps:');
    console.log('  1. Rebuild compliance checks: npx tsx src/scripts/rebuild-compliance-checks.ts');
    console.log('  2. Measure results: npx tsx src/scripts/final-coverage-analysis.ts');
  }

  await prisma.$disconnect();
}

applyMappings().catch(console.error);
```

### 3.3 Execute Mappings

**If using the script:**
1. Edit `apply-reverse-mappings.ts` and add your mappings to the array
2. Run: `npx tsx src/scripts/apply-reverse-mappings.ts`

---

## Step 4: Test & Measure

### 4.1 Rebuild Compliance Checks

```bash
cd server
npx tsx src/scripts/rebuild-compliance-checks.ts
```

**Watch for:**
- Increased extraction counts
- New strategies being used (abbreviation-expansion, synonym-matching)
- Better match rates per policy

### 4.2 Run Coverage Analysis

```bash
npx tsx src/scripts/final-coverage-analysis.ts > phase1-results.txt
```

### 4.3 Compare Results

**Document improvements:**

| Metric | Baseline | After Phase 1 | Improvement |
|--------|----------|---------------|-------------|
| Match Rate | ____% | ____% | +____% |
| Extracted Settings | ____ | ____ | +____ |
| Unique Controls | ____ | ____ | +____ |
| Strategy Usage | - | Abbrev: ____, Synonym: ____ | - |

**Expected improvements:**
- Match rate: 5.5% → 15-20%
- New strategies: 5-15 additional extractions from patterns
- Reverse mappings: 10-30 additional extractions

### 4.4 Analyze Strategy Usage

Create a quick analysis script to see which strategies are working:

📁 File: `server/src/scripts/analyze-strategy-usage.ts`

🔄 COMPLETE FILE:
```typescript
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
```

Run it:
```bash
npx tsx src/scripts/analyze-strategy-usage.ts
```

---

## Verification & Rollback

### Verification Checklist

- [ ] No TypeScript compilation errors
- [ ] New strategies appear in extraction logs
- [ ] Match rate improved by at least 5%
- [ ] No false positives in compliance checks
- [ ] Database updates applied successfully
- [ ] Coverage analysis shows improvement

### Success Criteria

**Minimum targets for Phase 1:**
- ✅ Match rate: 15%+ (from 5.5%)
- ✅ At least 5 settings using new strategies
- ✅ At least 10 settings with updated settingName
- ✅ No degradation in existing matches

### Rollback Procedure

**If Phase 1 causes problems:**

#### 1. Revert Code Changes

```bash
cd server
git checkout src/services/smart-extractor.service.ts
git checkout src/scripts/generate-reverse-mappings.ts
git checkout src/scripts/apply-reverse-mappings.ts
git checkout src/scripts/analyze-strategy-usage.ts
```

#### 2. Revert Database Changes

**Option A: Restore from backup**
```bash
cp database/compliance.backup.db database/compliance.db
```

**Option B: Revert specific changes**
```sql
-- Reset settingName for affected settings
UPDATE M365Setting 
SET settingName = NULL 
WHERE id IN (123, 456, 789); -- IDs you updated
```

#### 3. Rebuild

```bash
npx tsx src/scripts/rebuild-compliance-checks.ts
```

---

## Troubleshooting

### Issue: TypeScript Errors

**Symptom:** Compilation fails in smart-extractor.service.ts

**Solution:**
- Verify helper functions are added before strategies
- Check all function signatures match ExtractionStrategy interface
- Ensure RegExp patterns are escaped properly

### Issue: No New Matches

**Symptom:** Strategies added but no improvement in match rate

**Possible causes:**
1. **Property names don't use abbreviations** - Normal, move to reverse mappings
2. **Policy data structure issue** - Check if policyData is properly parsed
3. **Settings already matched** - Check baseline metrics

**Debug:**
```bash
npx tsx src/scripts/test-extraction.ts <policyId>
```

### Issue: False Positives

**Symptom:** Settings show extracted values that don't make sense

**Solution:**
- Lower confidence thresholds in validation service
- Add property name blacklist for known bad matches
- Adjust synonym/abbreviation dictionaries

### Issue: Reverse Mapping Script Fails

**Symptom:** generate-reverse-mappings.ts throws errors

**Common causes:**
- Policy data is not JSON parseable → Skip that policy
- Out of memory with large dataset → Reduce batch size
- Database connection timeout → Add connection pooling

---

## Next Steps After Phase 1

Once Phase 1 is complete and verified:

### Phase 2 Options (Week 1)

**Option A: Manual High-Value Targeting** (Highest ROI)
- Identify top 50 most important settings
- Research actual property names manually
- Apply with bulk update script
- Expected: +15-20% additional match rate

**Option B: Specialized Extractors** (Best for specific policy types)
- Build dedicated extractors for Settings Catalog
- Handle BitLocker and ASR policies specially
- Expected: +10-15% additional match rate

**Option C: Learning System** (Long-term benefit)
- Implement automatic settingName updates
- Track extraction success over time
- Expected: Compounding improvement

### Recommended: Start with Manual High-Value

Phase 2 should focus on **manual high-value targeting** because:
1. Highest immediate ROI
2. Guaranteed accurate mappings
3. Can complete in one session
4. Builds foundation for other improvements

---

## Summary

### What Phase 1 Accomplishes

✅ **Adds 2 new extraction strategies** (abbreviation, synonym)  
✅ **Discovers 10-50 better property names** via reverse mapping  
✅ **Improves match rate by 10-15%**  
✅ **Creates baseline for Phase 2**  
✅ **No breaking changes** - all additions

### Time Investment

- Code changes: 30-45 min
- Reverse mapping: 60-90 min
- Testing: 30 min
- **Total: 2-3 hours**

### Expected Outcome

**Before Phase 1:**
- Match rate: 5.5%
- Extracted settings: 25/456
- Verified controls: 8

**After Phase 1:**
- Match rate: 15-20%
- Extracted settings: 70-90/456
- Verified controls: 15-20

### Files Modified

- ✏️ `server/src/services/smart-extractor.service.ts`
- ➕ `server/src/scripts/generate-reverse-mappings.ts`
- ➕ `server/src/scripts/apply-reverse-mappings.ts`
- ➕ `server/src/scripts/analyze-strategy-usage.ts`
- 📊 Database: M365Setting.settingName updates

---

## Support & Resources

### Related Files

- Main extraction: `server/src/services/smart-extractor.service.ts`
- Validation: `server/src/services/m365-validation.service.ts`
- Rebuild: `server/src/scripts/rebuild-compliance-checks.ts`
- Analysis: `server/src/scripts/final-coverage-analysis.ts`

### Documentation

- Original guide: `POLICY_MATCHING_IMPROVEMENT_GUIDE.md`
- Schema: `server/prisma/schema.prisma`
- Project knowledge: NIST compliance docs

### Getting Help

If you encounter issues:
1. Check TypeScript compilation first
2. Review extraction logs for strategy usage
3. Verify policy data structure with test script
4. Compare before/after metrics carefully

---

**Last Updated:** 2025-11-20  
**Phase:** 1 of 3 (Quick Wins)  
**Status:** Ready for Claude Code execution  
**Estimated Duration:** 2-3 hours
