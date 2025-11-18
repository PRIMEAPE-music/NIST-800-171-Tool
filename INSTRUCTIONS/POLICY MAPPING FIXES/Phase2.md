# Phase 2: Auto-Categorization - Smart Setting Classification

## Overview

**What This Phase Does:**
- Analyzes your 636 M365Setting records and groups them by policy template
- Uses intelligent keyword matching to determine which settings belong to which policy types
- Links settings to specific template families (including Settings Catalog policies)
- Generates detailed reports showing categorization confidence
- Identifies settings that need manual review

**Why This Matters:**
Right now, when validating a Windows Update policy, the system tries to check ALL 636 settings against it. After Phase 2, it will only check the ~50-80 settings that actually apply to Windows Update policies.

**Time Estimate:** 2-3 hours

**Files Created:**
- `server/src/scripts/categorize-settings.ts` (main categorization script)
- `server/src/scripts/analyze-categorization.ts` (analysis and reporting)
- `server/src/utils/keyword-matcher.ts` (reusable matching utilities)

---

## Step 1: Create Keyword Matcher Utility

This utility will be used throughout Phase 2 to intelligently match settings to templates.

### Create New File: `server/src/utils/keyword-matcher.ts`

```typescript
/**
 * Keyword Matching Utilities
 *
 * Intelligent keyword-based classification for M365 settings
 * Updated to support Settings Catalog policy families
 */

export interface KeywordMatch {
  score: number;
  matchedKeywords: string[];
  confidence: 'high' | 'medium' | 'low' | 'none';
}

export interface CategoryDefinition {
  family: string;
  templates: string[];
  keywords: string[];
  strongKeywords?: string[]; // Higher weight keywords
  exclusionKeywords?: string[]; // If present, exclude from category
  platform?: string[]; // Platform-specific categories
}

/**
 * Category definitions for all M365 policy families
 * UPDATED: Includes Settings Catalog template types
 */
export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  // ===== WINDOWS UPDATE / SERVICING =====
  {
    family: 'Update',
    templates: [
      '#microsoft.graph.windowsUpdateForBusinessConfiguration'
    ],
    keywords: [
      'update', 'patch', 'servicing', 'deferral', 'ring', 'quality update',
      'feature update', 'driver', 'windows update', 'automatic update',
      'update mode', 'defer', 'pause', 'deadline', 'grace period',
      'restart', 'active hours', 'schedule', 'maintenance window'
    ],
    strongKeywords: ['windowsUpdateForBusiness', 'updateRing', 'deferral'],
    platform: ['Windows']
  },

  // ===== COMPLIANCE POLICIES =====
  {
    family: 'Compliance',
    templates: [
      '#microsoft.graph.windows10CompliancePolicy',
      '#microsoft.graph.androidCompliancePolicy',
      '#microsoft.graph.iosCompliancePolicy',
      '#microsoft.graph.macOSCompliancePolicy',
      '#settingsCatalog.customProfile' // Custom Settings Catalog compliance profiles
    ],
    keywords: [
      'password', 'passcode', 'pin', 'biometric', 'fingerprint', 'face id',
      'encryption', 'bitlocker', 'storage encryption', 'device encryption',
      'minimum version', 'os version', 'build version', 'security patch',
      'jailbreak', 'rooted', 'device health', 'attestation', 'tpm',
      'antivirus', 'firewall', 'defender', 'threat', 'secure boot',
      'code integrity', 'minimum length', 'complexity', 'expiration',
      'history', 'reuse', 'lockout', 'inactivity', 'timeout', 'wipe',
      'compliance check', 'health check'
    ],
    strongKeywords: ['compliance', 'required', 'minimum', 'maximum', 'policy'],
    platform: ['Windows', 'Android', 'iOS', 'macOS']
  },

  // ===== SECURITY BASELINES =====
  {
    family: 'SecurityBaseline',
    templates: [
      '#settingsCatalog.baseline'
    ],
    keywords: [
      'baseline', 'security baseline', 'hardening', 'cis', 'stig',
      'security configuration', 'best practice', 'recommended settings',
      'security standard', 'benchmark', 'compliance baseline',
      'windows security', 'defender baseline', 'edge baseline'
    ],
    strongKeywords: ['baseline', 'securityBaseline', 'hardening'],
    platform: ['Windows']
  },

  // ===== ENDPOINT DETECTION & RESPONSE =====
  {
    family: 'EndpointDetection',
    templates: [
      '#settingsCatalog.endpointSecurityEndpointDetectionAndResponse'
    ],
    keywords: [
      'edr', 'endpoint detection', 'response', 'defender for endpoint',
      'mde', 'microsoft defender', 'threat detection', 'advanced threat',
      'atp', 'onboarding', 'sensor', 'telemetry', 'sample sharing',
      'cloud protection', 'block at first sight', 'purview', 'investigation'
    ],
    strongKeywords: ['edr', 'endpointDetection', 'microsoftSense', 'defenderForEndpoint'],
    platform: ['Windows']
  },

  // ===== ATTACK SURFACE REDUCTION =====
  {
    family: 'AttackSurfaceReduction',
    templates: [
      '#settingsCatalog.endpointSecurityAttackSurfaceReduction'
    ],
    keywords: [
      'asr', 'attack surface', 'reduction', 'exploit protection',
      'controlled folder', 'ransomware protection', 'network protection',
      'web protection', 'exploit guard', 'application guard',
      'process creation', 'office macros', 'script obfuscation',
      'untrusted usb', 'email threats', 'audit mode', 'block mode'
    ],
    strongKeywords: ['asr', 'attackSurface', 'exploitGuard', 'controlledFolder'],
    platform: ['Windows']
  },

  // ===== DISK ENCRYPTION =====
  {
    family: 'DiskEncryption',
    templates: [
      '#settingsCatalog.endpointSecurityDiskEncryption'
    ],
    keywords: [
      'bitlocker', 'disk encryption', 'volume encryption', 'drive encryption',
      'tpm', 'recovery key', 'startup pin', 'encryption method',
      'aes', 'xts', 'cipher strength', 'fixed drive', 'removable drive',
      'operating system drive', 'recovery password', 'key escrow',
      'preboot authentication', 'enhanced pin'
    ],
    strongKeywords: ['bitlocker', 'diskEncryption', 'volumeEncryption', 'tpm'],
    platform: ['Windows']
  },

  // ===== APP PROTECTION / MAM =====
  {
    family: 'AppProtection',
    templates: [
      '#microsoft.graph.iosManagedAppProtection',
      '#microsoft.graph.androidManagedAppProtection',
      '#microsoft.graph.windowsManagedAppProtection',
      '#microsoft.graph.mdmWindowsInformationProtectionPolicy'
    ],
    keywords: [
      'app protection', 'mam', 'managed app', 'mobile application',
      'data transfer', 'copy', 'paste', 'cut', 'clipboard', 'share',
      'open-in', 'save as', 'print', 'backup', 'cloud backup',
      'app data', 'corporate data', 'organizational data', 'work data',
      'allowed apps', 'blocked apps', 'exempt apps', 'protected apps',
      'pin', 'app pin', 'biometric', 'face id', 'touch id',
      'offline', 'grace period', 'wipe', 'selective wipe', 'app wipe',
      'screen capture', 'screenshot', 'notification', 'keyboard',
      'encryption', 'app encryption', 'managed browser', 'edge'
    ],
    strongKeywords: ['appProtection', 'managedApp', 'dataTransfer', 'mam'],
    exclusionKeywords: ['device compliance', 'device configuration']
  },

  // ===== DEVICE CONFIGURATION =====
  {
    family: 'Configuration',
    templates: [
      '#microsoft.graph.windows10CustomConfiguration',
      '#microsoft.graph.windows10EndpointProtectionConfiguration',
      '#microsoft.graph.windows10GeneralConfiguration',
      '#microsoft.graph.iosGeneralDeviceConfiguration',
      '#microsoft.graph.androidGeneralDeviceConfiguration',
      '#settingsCatalog.customProfile' // Also matches custom profiles
    ],
    keywords: [
      'configuration', 'device setting', 'general configuration',
      'endpoint protection', 'custom configuration', 'oma-uri', 'csp',
      'wifi', 'vpn', 'certificate', 'email', 'browser', 'edge',
      'kiosk', 'assigned access', 'start menu', 'taskbar', 'cortana',
      'telemetry', 'diagnostic data', 'privacy', 'camera', 'microphone',
      'bluetooth', 'nfc', 'usb', 'removable storage', 'cd/dvd',
      'autoplay', 'elevated install', 'sam enumeration'
    ],
    strongKeywords: ['configuration', 'endpointProtection', 'customConfiguration', 'omaUri'],
    platform: ['Windows', 'Android', 'iOS', 'macOS']
  },

  // ===== CONDITIONAL ACCESS =====
  {
    family: 'ConditionalAccess',
    templates: [
      '#microsoft.graph.conditionalAccessPolicy'
    ],
    keywords: [
      'conditional access', 'ca policy', 'access control', 'sign-in',
      'authentication', 'mfa', 'multi-factor', 'trusted location',
      'named location', 'ip range', 'country', 'device state',
      'compliant device', 'hybrid joined', 'domain joined',
      'application', 'cloud app', 'risk level', 'user risk', 'sign-in risk',
      'session control', 'persistent browser', 'app enforced restrictions',
      'block access', 'grant access', 'require', 'terms of use'
    ],
    strongKeywords: ['conditionalAccess', 'grantControls', 'sessionControls'],
    platform: ['All']
  },

  // ===== MICROSOFT PURVIEW / DLP =====
  {
    family: 'Purview',
    templates: [
      '#microsoft.graph.dataLossPreventionPolicy',
      '#microsoft.graph.sensitivityLabel',
      '#microsoft.graph.retentionPolicy'
    ],
    keywords: [
      'data loss prevention', 'dlp', 'sensitive information', 'content contains',
      'credit card', 'ssn', 'social security', 'passport', 'driver license',
      'bank account', 'routing number', 'personal information', 'pii',
      'sensitivity label', 'classification', 'label', 'marking', 'header', 'footer',
      'retention', 'retention policy', 'hold', 'delete', 'archive',
      'lifecycle', 'disposition', 'records management', 'compliance tag',
      'sharing', 'external sharing', 'anyone link', 'guest access'
    ],
    strongKeywords: ['dataLossPrevention', 'sensitivityLabel', 'retentionPolicy'],
    platform: ['All']
  },

  // ===== AZURE AD / IDENTITY =====
  {
    family: 'AzureAD',
    templates: [
      '#microsoft.graph.authorizationPolicy',
      '#microsoft.graph.identitySecurityDefaultsEnforcementPolicy'
    ],
    keywords: [
      'azure ad', 'entra', 'directory', 'tenant', 'organization',
      'security defaults', 'mfa', 'legacy authentication', 'basic auth',
      'guest user', 'external user', 'b2b', 'collaboration',
      'self-service', 'password reset', 'group creation', 'app registration',
      'consent', 'permissions', 'admin consent', 'user consent'
    ],
    strongKeywords: ['azureAD', 'entra', 'securityDefaults'],
    platform: ['All']
  }
];

/**
 * Calculate keyword match score for a setting
 */
export function calculateKeywordScore(
  settingName: string,
  settingDescription: string | null,
  category: CategoryDefinition
): KeywordMatch {
  const searchText = `${settingName} ${settingDescription || ''}`.toLowerCase();

  let score = 0;
  const matchedKeywords: string[] = [];

  // Check exclusion keywords first
  if (category.exclusionKeywords) {
    for (const keyword of category.exclusionKeywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return {
          score: -100, // Negative score excludes from category
          matchedKeywords: [],
          confidence: 'none'
        };
      }
    }
  }

  // Check strong keywords (worth 3 points each)
  if (category.strongKeywords) {
    for (const keyword of category.strongKeywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += 3;
        matchedKeywords.push(keyword);
      }
    }
  }

  // Check regular keywords (worth 1 point each)
  for (const keyword of category.keywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      score += 1;
      matchedKeywords.push(keyword);
    }
  }

  // Calculate confidence based on score
  let confidence: 'high' | 'medium' | 'low' | 'none';
  if (score >= 5) {
    confidence = 'high';
  } else if (score >= 3) {
    confidence = 'medium';
  } else if (score >= 1) {
    confidence = 'low';
  } else {
    confidence = 'none';
  }

  return {
    score,
    matchedKeywords: [...new Set(matchedKeywords)], // Remove duplicates
    confidence
  };
}

/**
 * Find best matching category for a setting
 */
export function findBestCategory(
  settingName: string,
  settingDescription: string | null,
  settingPlatform: string
): {
  category: CategoryDefinition | null;
  match: KeywordMatch;
  alternatives: Array<{ category: CategoryDefinition; match: KeywordMatch }>;
} {
  let bestCategory: CategoryDefinition | null = null;
  let bestMatch: KeywordMatch = { score: 0, matchedKeywords: [], confidence: 'none' };
  const alternatives: Array<{ category: CategoryDefinition; match: KeywordMatch }> = [];

  for (const category of CATEGORY_DEFINITIONS) {
    // Skip if platform doesn't match
    if (category.platform &&
        !category.platform.includes('All') &&
        !category.platform.includes(settingPlatform)) {
      continue;
    }

    const match = calculateKeywordScore(settingName, settingDescription, category);

    // Track alternatives (any category with score > 0)
    if (match.score > 0) {
      alternatives.push({ category, match });
    }

    // Update best match
    if (match.score > bestMatch.score) {
      bestMatch = match;
      bestCategory = category;
    }
  }

  // Sort alternatives by score
  alternatives.sort((a, b) => b.match.score - a.match.score);

  return {
    category: bestCategory,
    match: bestMatch,
    alternatives: alternatives.slice(1) // Exclude best match from alternatives
  };
}

/**
 * Normalize display name for better matching
 */
export function normalizeDisplayName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // Replace special chars with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Extract platform from setting name or description
 */
export function extractPlatform(
  settingName: string,
  settingDescription: string | null,
  existingPlatform: string
): string {
  if (existingPlatform && existingPlatform !== 'All') {
    return existingPlatform;
  }

  const text = `${settingName} ${settingDescription || ''}`.toLowerCase();

  if (text.includes('windows') || text.includes('win10') || text.includes('win11')) {
    return 'Windows';
  }
  if (text.includes('android')) {
    return 'Android';
  }
  if (text.includes('ios') || text.includes('iphone') || text.includes('ipad')) {
    return 'iOS';
  }
  if (text.includes('macos') || text.includes('mac os')) {
    return 'macOS';
  }

  return 'All';
}
```

---

## Step 2: Create Main Categorization Script

This is the core script that will categorize all 636 settings.

### Create New File: `server/src/scripts/categorize-settings.ts`

```typescript
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
```

---

## Step 3: Run Dry Run (Preview)

Let's first run a dry run to see what the categorization would look like WITHOUT making database changes.

```bash
npx tsx server/src/scripts/categorize-settings.ts --dry-run --export
```

---

## Step 4: Review Results

Open the exported JSON file to review categorization details:

```bash
# View the results (use PowerShell on Windows)
Get-Content categorization-results.json | ConvertFrom-Json | Where-Object { $_.needsReview -eq $true } | Select-Object displayName, assignedFamily, confidence, score
```

---

## Step 5: Apply Categorization

Once you've reviewed the dry run results and they look good:

```bash
# Apply categorization to database
npx tsx server/src/scripts/categorize-settings.ts
```

---

## Step 6: Create Analysis Script

### Create New File: `server/src/scripts/analyze-categorization.ts`

```typescript
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

  console.log('');
  console.log('='.repeat(70));

  await prisma.$disconnect();
}

analyzeCategorizationResults();
```

### Run the analysis:

```bash
npx tsx server/src/scripts/analyze-categorization.ts
```

---

## Verification Checklist

### 1. Database Check
```sql
-- Check categorization distribution
SELECT
  template_family,
  COUNT(*) as count
FROM m365_setting_catalog
WHERE is_active = 1
GROUP BY template_family
ORDER BY count DESC;
```

### 2. Test Query
```typescript
// Test filtering works
const complianceSettings = await prisma.m365Setting.findMany({
  where: { templateFamily: 'Compliance' }
});
console.log(`Found ${complianceSettings.length} Compliance settings`);

const baselineSettings = await prisma.m365Setting.findMany({
  where: { templateFamily: 'SecurityBaseline' }
});
console.log(`Found ${baselineSettings.length} SecurityBaseline settings`);
```

---

## Troubleshooting

### Issue: All settings showing as uncategorized

Check if keywords are matching:
```typescript
import { findBestCategory } from './utils/keyword-matcher.js';

// Test a specific setting
const testSetting = "BitLocker - Require Encryption";
const result = findBestCategory(testSetting, null, "Windows");
console.log(result);
```

### Issue: Settings in wrong category

Use exclusion keywords or adjust keyword weights in `keyword-matcher.ts`.
