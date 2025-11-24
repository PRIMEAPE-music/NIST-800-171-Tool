# Policy Matching Improvement Guide

## Executive Summary

**Current State:**
- Match rate: 5.5% (25 out of 456 settings with controls successfully matched)
- Intune policies showing: 43 unique controls (via template fallback)
- Verified controls: 8 (from actual compliance checks)

**Goal:** Increase verified match rate from 5.5% to 20-40% through systematic improvements.

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Why Matching is Hard](#why-matching-is-hard)
3. [Approach 1: Pattern-Based Matching](#approach-1-pattern-based-matching)
4. [Approach 2: Learning System](#approach-2-learning-system)
5. [Approach 3: Specialized Intune Extractors](#approach-3-specialized-intune-extractors)
6. [Approach 4: Reverse Mapping from Data](#approach-4-reverse-mapping-from-data)
7. [Approach 5: Manual High-Value Targeting](#approach-5-manual-high-value-targeting)
8. [Recommended Implementation Order](#recommended-implementation-order)

---

## Current Architecture

### Data Flow

```
M365 Policy (JSON)
  ↓
extractActualValue() [6 strategies]
  ↓
Match to M365Setting.settingName
  ↓
Create SettingComplianceCheck
  ↓
Link to Controls via SettingControlMapping
```

### Existing Extraction Strategies

Located in: `server/src/scripts/rebuild-compliance-checks.ts`

1. **Direct property match**: `policyData[settingName]`
2. **Alternate names**: Try names from `alternateNames` JSON field
3. **Strip prefix**: `authorizationPolicy.allowedToUseSSPR` → `allowedToUseSSPR`
4. **Path-based lookup**: Nested property access via dot notation
5. **Settings array search**: For settingsCatalog policies
6. **Case-insensitive match**: Fuzzy string matching

### Current Limitations

1. **Name mismatches**: M365Setting names don't match actual Graph API properties
2. **Template variations**: Different policy templates have different structures
3. **Nested data**: settingsCatalog policies hide values deep in arrays
4. **Abstract settings**: Some settings are conceptual, not literal properties

---

## Why Matching is Hard

### Problem Examples

#### Example 1: Name Variations
```json
// Policy Data (actual)
{
  "passwordMinimumLength": 14
}

// M365Setting (catalog)
{
  "settingName": "minPasswordLength"  // ❌ Doesn't match!
}
```

#### Example 2: Nested Settings Catalog
```json
// Policy Data
{
  "settings": [
    {
      "settingInstance": {
        "settingDefinitionId": "device_vendor_msft_policy_config_bitlocker_systemdrivesrecoveryoptions",
        "simpleSettingValue": { "value": true }
      }
    }
  ]
}

// M365Setting
{
  "settingName": "BitLockerSystemDriveRecovery"  // ❌ Doesn't match settingDefinitionId!
}
```

#### Example 3: Multiple Properties = One Setting
```json
// Policy has multiple properties
{
  "passwordMinimumLength": 14,
  "passwordRequiredType": "deviceDefault",
  "passwordRequiredToUnlockFromIdle": true
}

// But M365Setting expects them as one logical setting
{
  "settingName": "PasswordPolicy.Complexity",
  "displayName": "Windows Hello for Business Password Complexity"
}
```

---

## Approach 1: Pattern-Based Matching

### Description
Add intelligent string transformation strategies to match setting names to property names.

### Implementation Complexity: ⭐ Low (30 minutes)
### Expected Improvement: 📈 +5-10% match rate

### How It Works

Add 3 new extraction strategies to `extractActualValue()`:

#### Strategy 7: CamelCase Variations
```typescript
function getCamelCaseVariations(settingName: string): string[] {
  return [
    settingName,                                    // passwordMinimumLength
    settingName[0].toUpperCase() + settingName.slice(1),  // PasswordMinimumLength
    settingName.toLowerCase(),                      // passwordminimumlength
    settingName.replace(/([A-Z])/g, '_$1').toLowerCase(), // password_minimum_length
    settingName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase() // password_minimum_length
  ];
}
```

#### Strategy 8: Abbreviation Expansion
```typescript
const abbreviations: Record<string, string[]> = {
  'pwd': ['password', 'passwd'],
  'min': ['minimum', 'minimized'],
  'max': ['maximum', 'maximized'],
  'auth': ['authentication', 'authorization'],
  'config': ['configuration', 'configured'],
  'req': ['required', 'require'],
  'mgmt': ['management'],
  'svc': ['service'],
};

function expandAbbreviations(settingName: string): string[] {
  const variations: string[] = [settingName];

  for (const [abbr, expansions] of Object.entries(abbreviations)) {
    if (settingName.toLowerCase().includes(abbr)) {
      for (const expansion of expansions) {
        variations.push(
          settingName.replace(new RegExp(abbr, 'gi'), expansion)
        );
      }
    }
  }

  return variations;
}
```

#### Strategy 9: Synonym Matching
```typescript
const synonyms: Record<string, string[]> = {
  'required': ['enabled', 'enforce', 'mandatory'],
  'blocked': ['disabled', 'prevent', 'deny'],
  'allowed': ['enabled', 'permit', 'authorize'],
  'minimum': ['min', 'least'],
  'maximum': ['max', 'most'],
};

function getSynonymVariations(settingName: string): string[] {
  const variations: string[] = [settingName];

  for (const [word, syns] of Object.entries(synonyms)) {
    if (settingName.toLowerCase().includes(word)) {
      for (const syn of syns) {
        variations.push(
          settingName.replace(new RegExp(word, 'gi'), syn)
        );
      }
    }
  }

  return variations;
}
```

### Implementation Steps

1. **Add helper functions** to `rebuild-compliance-checks.ts`:

```typescript
/**
 * Strategy 7-9: Pattern-based matching with variations
 */
function tryPatternBasedMatching(policyData: any, setting: any): any {
  if (!setting.settingName) return null;

  // Get all possible variations
  const variations = new Set<string>();

  // CamelCase variations
  getCamelCaseVariations(setting.settingName).forEach(v => variations.add(v));

  // Abbreviation expansions
  expandAbbreviations(setting.settingName).forEach(v => variations.add(v));

  // Synonym variations
  getSynonymVariations(setting.settingName).forEach(v => variations.add(v));

  // Try each variation
  for (const variation of variations) {
    if (policyData[variation] !== undefined) {
      return policyData[variation];
    }
  }

  return null;
}
```

2. **Add to extractActualValue()** (after Strategy 6):

```typescript
// Strategy 7-9: Pattern-based matching
const patternMatch = tryPatternBasedMatching(policyData, setting);
if (patternMatch !== null) {
  return patternMatch;
}
```

3. **Test and measure**:

```bash
cd server
npx tsx src/scripts/rebuild-compliance-checks.ts
npx tsx src/scripts/final-coverage-analysis.ts
```

### Pros & Cons

✅ **Pros:**
- Quick to implement
- No database changes
- Automatic - no manual work
- Low risk

❌ **Cons:**
- May create false positives
- Limited improvement (~5-10%)
- Doesn't solve fundamental name mismatches

---

## Approach 2: Learning System

### Description
Automatically update `settingName` when extractions succeed, creating a self-improving system.

### Implementation Complexity: ⭐⭐ Medium (2 hours)
### Expected Improvement: 📈 +10-20% match rate (over time)

### How It Works

Track which property names successfully extract values, then update the database:

```typescript
// When extraction succeeds, record it
if (actualValue !== null) {
  await prisma.m365Setting.update({
    where: { id: setting.id },
    data: {
      settingName: successfulPropertyName,
      lastSuccessfulStrategy: strategyName,
      successfulExtractions: { increment: 1 },
      lastExtractedValue: String(actualValue).substring(0, 100),
      lastExtractedAt: new Date()
    }
  });
}
```

### Database Schema

Already exists in `schema.prisma`:

```prisma
model M365Setting {
  // ... existing fields

  // Learning metrics - track extraction success over time
  successfulExtractions  Int       @default(0) @map("successful_extractions")
  failedExtractions      Int       @default(0) @map("failed_extractions")
  lastExtractedValue     String?   @map("last_extracted_value")
  lastExtractedAt        DateTime? @map("last_extracted_at")
  lastSuccessfulStrategy String?   @map("last_successful_strategy")
}
```

### Implementation Steps

1. **Update extractActualValue()** to return metadata:

```typescript
interface ExtractionResult {
  value: any;
  propertyName: string;
  strategy: string;
}

function extractActualValue(policyData: any, setting: any): ExtractionResult | null {
  // Strategy 1: Direct property match
  if (setting.settingName && policyData[setting.settingName] !== undefined) {
    return {
      value: policyData[setting.settingName],
      propertyName: setting.settingName,
      strategy: 'direct'
    };
  }

  // ... other strategies (update to return metadata)

  return null;
}
```

2. **Update rebuild-compliance-checks.ts** to record successes:

```typescript
for (const setting of settings) {
  const result = extractActualValue(parsedData, setting);

  if (result !== null && result.value !== undefined) {
    const isCompliant = checkCompliance(result.value, setting.expectedValue, setting.validationOperator);

    // Create compliance check
    await prisma.settingComplianceCheck.create({
      data: {
        policyId: policy.id,
        settingId: setting.id,
        expectedValue: String(setting.expectedValue),
        actualValue: String(result.value),
        isCompliant,
        lastChecked: new Date(),
      }
    });

    // LEARNING: Update setting with successful extraction
    if (result.propertyName !== setting.settingName) {
      await prisma.m365Setting.update({
        where: { id: setting.id },
        data: {
          settingName: result.propertyName,
          lastSuccessfulStrategy: result.strategy,
          successfulExtractions: { increment: 1 },
          lastExtractedValue: String(result.value).substring(0, 100),
          lastExtractedAt: new Date()
        }
      });

      console.log(`  📚 Learned: ${setting.displayName} -> ${result.propertyName}`);
    } else {
      // Just increment counter
      await prisma.m365Setting.update({
        where: { id: setting.id },
        data: {
          successfulExtractions: { increment: 1 },
          lastExtractedAt: new Date()
        }
      });
    }

    checksCreated++;
  } else {
    // Record failure
    await prisma.m365Setting.update({
      where: { id: setting.id },
      data: {
        failedExtractions: { increment: 1 }
      }
    });
  }
}
```

3. **Create analysis script** to track learning progress:

```typescript
// server/src/scripts/analyze-learning-progress.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeLearning() {
  const stats = await prisma.m365Setting.aggregate({
    _count: true,
    _sum: {
      successfulExtractions: true,
      failedExtractions: true
    },
    where: {
      controlMappings: { some: {} }
    }
  });

  const learned = await prisma.m365Setting.count({
    where: {
      successfulExtractions: { gt: 0 },
      controlMappings: { some: {} }
    }
  });

  console.log('Learning Progress:');
  console.log(`Settings with controls: ${stats._count}`);
  console.log(`Successfully matched: ${learned} (${(learned / stats._count * 100).toFixed(1)}%)`);
  console.log(`Total extractions: ${stats._sum.successfulExtractions}`);
  console.log(`Failed attempts: ${stats._sum.failedExtractions}`);

  await prisma.$disconnect();
}

analyzeLearning();
```

### Pros & Cons

✅ **Pros:**
- Self-improving over time
- No manual work needed
- Learns from actual data
- Compound improvement with each sync

❌ **Cons:**
- Requires database writes (slower)
- Could learn incorrect mappings
- Takes time to reach full potential
- Need safeguards against bad data

---

## Approach 3: Specialized Intune Extractors

### Description
Create type-specific extraction logic for each Intune policy family.

### Implementation Complexity: ⭐⭐⭐ High (4-6 hours)
### Expected Improvement: 📈 +15-25% match rate

### Intune Policy Families

1. **Compliance Policies** (`#microsoft.graph.windows10CompliancePolicy`)
   - Structure: Flat top-level properties
   - Example: `passwordRequired`, `osMinimumVersion`

2. **App Protection** (`#microsoft.graph.iosManagedAppProtection`)
   - Structure: Flat top-level properties
   - Example: `pinRequired`, `saveAsBlocked`

3. **Configuration Profiles** (`#microsoft.graph.iosGeneralDeviceConfiguration`)
   - Structure: Flat top-level properties
   - Example: `passcodeRequired`, `fingerprintUnlockAllowed`

4. **Settings Catalog** (`#settingsCatalog.*`)
   - Structure: Complex nested arrays
   - Example: Deep in `settings[].settingInstance.settingDefinitionId`

5. **Security Baselines** (`#settingsCatalog.baseline`)
   - Structure: Complex nested arrays
   - Example: Same as Settings Catalog

### Implementation

Create specialized extractors:

```typescript
// server/src/lib/intune-extractors.ts

export interface IntuneExtractor {
  canHandle(odataType: string): boolean;
  extract(policyData: any, setting: any): any;
}

/**
 * Extractor for flat-structure policies (compliance, app protection, config)
 */
export class FlatPropertyExtractor implements IntuneExtractor {
  private readonly supportedTypes = [
    '#microsoft.graph.windows10CompliancePolicy',
    '#microsoft.graph.iosCompliancePolicy',
    '#microsoft.graph.androidCompliancePolicy',
    '#microsoft.graph.iosManagedAppProtection',
    '#microsoft.graph.androidManagedAppProtection',
    '#microsoft.graph.iosGeneralDeviceConfiguration',
  ];

  canHandle(odataType: string): boolean {
    return this.supportedTypes.includes(odataType);
  }

  extract(policyData: any, setting: any): any {
    // Try direct match
    if (setting.settingName && policyData[setting.settingName] !== undefined) {
      return policyData[setting.settingName];
    }

    // Try case-insensitive
    if (setting.settingName) {
      const lowerName = setting.settingName.toLowerCase();
      for (const key of Object.keys(policyData)) {
        if (key.toLowerCase() === lowerName) {
          return policyData[key];
        }
      }
    }

    return null;
  }
}

/**
 * Extractor for Settings Catalog policies
 */
export class SettingsCatalogExtractor implements IntuneExtractor {
  private readonly supportedTypes = [
    '#settingsCatalog.customProfile',
    '#settingsCatalog.baseline',
    '#settingsCatalog.endpointSecurityAttackSurfaceReduction',
    '#settingsCatalog.endpointSecurityDiskEncryption',
    '#settingsCatalog.endpointSecurityEndpointDetectionAndResponse',
  ];

  canHandle(odataType: string): boolean {
    return this.supportedTypes.includes(odataType);
  }

  extract(policyData: any, setting: any): any {
    if (!policyData.settings || !Array.isArray(policyData.settings)) {
      return null;
    }

    return this.searchSettingsArray(
      policyData.settings,
      setting.settingName,
      setting.displayName
    );
  }

  private searchSettingsArray(settings: any[], settingName: string | null, displayName: string): any {
    for (const group of settings) {
      if (group.settingInstance) {
        const value = this.extractFromInstance(group.settingInstance, settingName, displayName);
        if (value !== undefined) return value;
      }

      if (group.children && Array.isArray(group.children)) {
        const childValue = this.searchSettingsArray(group.children, settingName, displayName);
        if (childValue !== undefined) return childValue;
      }
    }

    return null;
  }

  private extractFromInstance(instance: any, settingName: string | null, displayName: string): any {
    // Match by settingDefinitionId
    if (instance.settingDefinitionId && settingName) {
      const definitionId = instance.settingDefinitionId.toLowerCase();
      const searchName = settingName.toLowerCase();

      // Exact match
      if (definitionId.includes(searchName) || searchName.includes(definitionId)) {
        return this.extractValue(instance);
      }

      // Partial word match
      const definitionWords = definitionId.split('_');
      const searchWords = searchName.split(/[._-]/);

      const matchCount = searchWords.filter(word =>
        definitionWords.some(dWord => dWord.includes(word) || word.includes(dWord))
      ).length;

      if (matchCount >= Math.min(searchWords.length, 3)) {
        return this.extractValue(instance);
      }
    }

    // Match by display name
    if (instance.displayName && displayName) {
      const similarity = instance.displayName.toLowerCase().includes(displayName.toLowerCase()) ||
                        displayName.toLowerCase().includes(instance.displayName.toLowerCase());
      if (similarity) {
        return this.extractValue(instance);
      }
    }

    return undefined;
  }

  private extractValue(instance: any): any {
    if (instance.simpleSettingValue) {
      return instance.simpleSettingValue.value;
    } else if (instance.choiceSettingValue) {
      return instance.choiceSettingValue.value;
    } else if (instance.groupSettingValue) {
      return JSON.stringify(instance.groupSettingValue);
    }
    return undefined;
  }
}

/**
 * Extractor registry - tries each extractor in order
 */
export class IntuneExtractorRegistry {
  private extractors: IntuneExtractor[] = [
    new SettingsCatalogExtractor(),
    new FlatPropertyExtractor(),
  ];

  extract(odataType: string, policyData: any, setting: any): any {
    for (const extractor of this.extractors) {
      if (extractor.canHandle(odataType)) {
        const value = extractor.extract(policyData, setting);
        if (value !== null && value !== undefined) {
          return value;
        }
      }
    }

    return null;
  }
}
```

### Integration

Update `rebuild-compliance-checks.ts`:

```typescript
import { IntuneExtractorRegistry } from '../lib/intune-extractors';

const extractorRegistry = new IntuneExtractorRegistry();

function extractActualValue(policyData: any, setting: any, odataType?: string): any {
  // Try specialized Intune extractors first
  if (odataType) {
    const value = extractorRegistry.extract(odataType, policyData, setting);
    if (value !== null && value !== undefined) {
      return value;
    }
  }

  // Fall back to existing strategies
  // ... (keep existing code)
}
```

### Pros & Cons

✅ **Pros:**
- Highest potential improvement
- Type-aware, intelligent matching
- Can handle complex nested structures
- Clean, maintainable architecture

❌ **Cons:**
- Most complex to implement
- Requires understanding each template type
- More code to maintain
- Need to update when Microsoft changes APIs

---

## Approach 4: Reverse Mapping from Data

### Description
Analyze actual policy data to automatically discover property names and create mappings.

### Implementation Complexity: ⭐⭐ Medium (3 hours)
### Expected Improvement: 📈 +10-15% match rate

### How It Works

1. Extract all unique property names from actual policies
2. Group by policy template type
3. Match property names to settings using similarity scoring
4. Generate mapping recommendations

### Implementation

```typescript
// server/src/scripts/generate-property-mappings.ts

import { PrismaClient } from '@prisma/client';
import { similarity } from '../lib/string-utils';

const prisma = new PrismaClient();

async function generateMappings() {
  console.log('Analyzing actual policy data...\n');

  // Get all policies with their data
  const policies = await prisma.m365Policy.findMany({
    where: { policyType: 'Intune' },
    select: {
      id: true,
      policyName: true,
      odataType: true,
      policyData: true
    }
  });

  // Extract properties by template
  const propertyMap = new Map<string, Set<string>>();

  for (const policy of policies) {
    if (!policy.odataType) continue;

    if (!propertyMap.has(policy.odataType)) {
      propertyMap.set(policy.odataType, new Set());
    }

    try {
      const data = JSON.parse(policy.policyData);
      const properties = extractAllProperties(data);
      properties.forEach(prop => propertyMap.get(policy.odataType)!.add(prop));
    } catch (e) {
      // Skip
    }
  }

  console.log('Property Analysis:');
  for (const [template, props] of propertyMap) {
    console.log(`\n${template}: ${props.size} unique properties`);
  }

  // Get settings that need mapping
  const settings = await prisma.m365Setting.findMany({
    where: {
      controlMappings: { some: {} },
      isActive: true,
      OR: [
        { successfulExtractions: 0 },
        { successfulExtractions: null }
      ]
    },
    include: {
      controlMappings: {
        include: {
          control: { select: { controlId: true } }
        }
      }
    }
  });

  console.log(`\n\nFound ${settings.length} settings needing mappings\n`);

  // Generate mapping recommendations
  const recommendations: any[] = [];

  for (const setting of settings) {
    const templateProps = propertyMap.get(setting.policyTemplate);
    if (!templateProps || templateProps.size === 0) continue;

    // Find best matching property
    let bestMatch = null;
    let bestScore = 0;

    for (const prop of Array.from(templateProps)) {
      const score = similarity(setting.settingName || '', prop);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = prop;
      }
    }

    if (bestMatch && bestScore > 0.4) {
      const controls = setting.controlMappings.map(m => m.control.controlId).join(', ');
      recommendations.push({
        settingId: setting.id,
        displayName: setting.displayName,
        currentName: setting.settingName,
        suggestedName: bestMatch,
        confidence: bestScore,
        template: setting.policyTemplate,
        controls: controls
      });
    }
  }

  // Sort by confidence and control count
  recommendations.sort((a, b) => {
    const aControls = a.controls.split(',').length;
    const bControls = b.controls.split(',').length;
    if (aControls !== bControls) return bControls - aControls;
    return b.confidence - a.confidence;
  });

  console.log('='.repeat(80));
  console.log('MAPPING RECOMMENDATIONS (Top 50)');
  console.log('='.repeat(80));

  for (const rec of recommendations.slice(0, 50)) {
    console.log(`\n${rec.displayName}`);
    console.log(`  Current:    ${rec.currentName || 'NULL'}`);
    console.log(`  Suggested:  ${rec.suggestedName}`);
    console.log(`  Confidence: ${(rec.confidence * 100).toFixed(1)}%`);
    console.log(`  Controls:   ${rec.controls}`);
  }

  console.log(`\n\nTotal recommendations: ${recommendations.length}`);

  // Optionally write to file for review
  const fs = require('fs');
  fs.writeFileSync(
    'property-mapping-recommendations.json',
    JSON.stringify(recommendations, null, 2)
  );
  console.log('\nFull recommendations written to: property-mapping-recommendations.json');

  await prisma.$disconnect();
}

function extractAllProperties(obj: any, prefix = ''): string[] {
  const props: string[] = [];

  if (typeof obj !== 'object' || obj === null) return props;

  for (const key of Object.keys(obj)) {
    if (key.startsWith('@odata') || key === 'id') continue;

    const fullKey = prefix ? `${prefix}.${key}` : key;
    props.push(fullKey);

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      if (prefix.split('.').length < 2) {  // Limit depth
        props.push(...extractAllProperties(obj[key], fullKey));
      }
    }
  }

  return props;
}

generateMappings().catch(console.error);
```

### Usage

1. Run the script:
```bash
cd server
npx tsx src/scripts/generate-property-mappings.ts
```

2. Review `property-mapping-recommendations.json`

3. Apply high-confidence mappings (>70%):
```typescript
// server/src/scripts/apply-mappings.ts
import { PrismaClient } from '@prisma/client';
import recommendations from './property-mapping-recommendations.json';

const prisma = new PrismaClient();

async function applyMappings() {
  const highConfidence = recommendations.filter(r => r.confidence > 0.7);

  console.log(`Applying ${highConfidence.length} high-confidence mappings...\n`);

  for (const rec of highConfidence) {
    await prisma.m365Setting.update({
      where: { id: rec.settingId },
      data: { settingName: rec.suggestedName }
    });
    console.log(`✓ ${rec.displayName} -> ${rec.suggestedName}`);
  }

  console.log('\nDone! Run rebuild-compliance-checks.ts to test results.');
  await prisma.$disconnect();
}

applyMappings();
```

### Pros & Cons

✅ **Pros:**
- Data-driven, objective
- Discovers actual property names
- Can find patterns humans miss
- Generates batch updates

❌ **Cons:**
- Requires manual review of recommendations
- May suggest incorrect mappings
- One-time benefit (doesn't adapt over time)
- Limited by quality of similarity algorithm

---

## Approach 5: Manual High-Value Targeting

### Description
Manually map the top 50-100 most important settings that have the most controls and are most commonly configured.

### Implementation Complexity: ⭐ Low (2-4 hours of manual work)
### Expected Improvement: 📈 +15-20% match rate

### Strategy

Focus manual effort on settings that give the most value:
1. Settings mapped to 3+ controls
2. Settings for high-priority controls (Critical/High)
3. Settings commonly found in standard policies

### Identify High-Value Settings

```typescript
// server/src/scripts/identify-high-value-settings.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function identifyHighValueSettings() {
  // Get settings with control mappings
  const settings = await prisma.m365Setting.findMany({
    where: {
      isActive: true,
      controlMappings: { some: {} }
    },
    include: {
      controlMappings: {
        include: {
          control: {
            select: {
              controlId: true,
              priority: true,
              family: true
            }
          }
        }
      }
    }
  });

  // Score each setting
  const scored = settings.map(setting => {
    const controlCount = setting.controlMappings.length;
    const highPriorityCount = setting.controlMappings.filter(
      m => m.control.priority === 'Critical' || m.control.priority === 'High'
    ).length;

    // Simple scoring: controls * 10 + high priority * 5
    const score = controlCount * 10 + highPriorityCount * 5;

    return {
      id: setting.id,
      displayName: setting.displayName,
      settingName: setting.settingName,
      template: setting.policyTemplate,
      controlCount,
      highPriorityCount,
      controls: setting.controlMappings.map(m => m.control.controlId).join(', '),
      score
    };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  console.log('TOP 50 HIGH-VALUE SETTINGS TO MAP MANUALLY:\n');
  console.log('='.repeat(80));

  for (const [idx, setting] of scored.slice(0, 50).entries()) {
    console.log(`\n${idx + 1}. ${setting.displayName}`);
    console.log(`   Template: ${setting.template}`);
    console.log(`   Current Name: ${setting.settingName || 'NULL'}`);
    console.log(`   Controls: ${setting.controlCount} (${setting.highPriorityCount} high priority)`);
    console.log(`   IDs: ${setting.controls}`);
    console.log(`   Score: ${setting.score}`);
  }

  await prisma.$disconnect();
}

identifyHighValueSettings().catch(console.error);
```

### Manual Mapping Process

1. Run the identifier script
2. For each setting:
   a. Find a policy with that template in your M365 portal
   b. Look at the actual configuration
   c. Find the corresponding property name
   d. Update the database

3. Use a tracking spreadsheet:

| Setting Name | Template | Actual Property | Status |
|-------------|----------|-----------------|--------|
| Password Min Length | windows10Compliance | passwordMinimumLength | ✓ Done |
| BitLocker Enabled | windows10Compliance | bitLockerEnabled | ✓ Done |
| ... | ... | ... | ... |

### Bulk Update Script

```typescript
// server/src/scripts/bulk-update-mappings.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Manual mappings discovered through research
const manualMappings = [
  { displayName: 'Intune - Password Required (Windows)', settingName: 'passwordRequired' },
  { displayName: 'Intune - Password Expiration (Windows)', settingName: 'passwordExpirationDays' },
  { displayName: 'Intune - Require Data Storage Encryption (Windows)', settingName: 'storageRequireEncryption' },
  { displayName: 'Require Supported Windows Version', settingName: 'osMinimumVersion' },
  // Add more as you discover them...
];

async function bulkUpdateMappings() {
  console.log(`Updating ${manualMappings.length} manual mappings...\n`);

  for (const mapping of manualMappings) {
    const setting = await prisma.m365Setting.findFirst({
      where: { displayName: mapping.displayName }
    });

    if (setting) {
      await prisma.m365Setting.update({
        where: { id: setting.id },
        data: { settingName: mapping.settingName }
      });
      console.log(`✓ ${mapping.displayName} -> ${mapping.settingName}`);
    } else {
      console.log(`✗ Not found: ${mapping.displayName}`);
    }
  }

  console.log('\nDone!');
  await prisma.$disconnect();
}

bulkUpdateMappings();
```

### Pros & Cons

✅ **Pros:**
- Guaranteed accurate mappings
- High ROI - focus on most important settings
- Can complete in one session
- Immediate improvement

❌ **Cons:**
- Manual, time-consuming work
- Requires M365 admin portal access
- Doesn't scale to all 456 settings
- One-time benefit

---

## Recommended Implementation Order

### Phase 1: Quick Wins (Day 1)
**Time: 2-3 hours | Expected improvement: +10-15%**

1. ✅ **Approach 1: Pattern-Based Matching** (30 min)
   - Implement CamelCase, abbreviation, synonym strategies
   - Test and measure

2. ✅ **Approach 4: Generate Reverse Mappings** (1 hour)
   - Run the generation script
   - Review top 50 recommendations
   - Apply high-confidence (>70%) mappings

3. ✅ **Test Results** (30 min)
   - Run rebuild-compliance-checks
   - Run final-coverage-analysis
   - Document improvement

### Phase 2: Targeted Effort (Week 1)
**Time: 4-6 hours | Expected improvement: +15-20%**

1. ✅ **Approach 5: Manual High-Value** (2-4 hours)
   - Identify top 50 high-value settings
   - Research actual property names
   - Create bulk update script
   - Apply mappings

2. ✅ **Approach 3: Specialized Extractors** (2 hours)
   - Implement SettingsCatalogExtractor
   - Test with BitLocker and ASR policies
   - Measure improvement

### Phase 3: Long-Term (Ongoing)
**Time: 2 hours initial setup | Compound improvement over time**

1. ✅ **Approach 2: Learning System** (2 hours)
   - Implement automatic learning
   - Add monitoring dashboard
   - Let it improve naturally with each sync

### Expected Results Timeline

| Phase | Match Rate | Verified Controls | Timeline |
|-------|-----------|-------------------|----------|
| **Current** | 5.5% | 8 | - |
| **After Phase 1** | 15-20% | 15-20 | Day 1 |
| **After Phase 2** | 30-40% | 25-35 | Week 1 |
| **After Phase 3** | 40-60% | 35-50 | Month 1-3 |

---

## Testing & Validation

### After Each Change

1. **Rebuild compliance checks**:
```bash
cd server
npx tsx src/scripts/rebuild-compliance-checks.ts
```

2. **Analyze results**:
```bash
npx tsx src/scripts/final-coverage-analysis.ts
```

3. **Check specific policies**:
```bash
npx tsx src/scripts/test-control-matching.ts
```

### Success Metrics

- **Match rate**: % of settings with controls that have verified values
- **Control coverage**: # of unique controls across all policies
- **Compliance accuracy**: % of compliance checks that make sense

### Rollback Procedure

If changes cause problems:

1. **Revert code changes**: Git checkout previous commit
2. **Restore database**:
   ```bash
   # If you have a backup
   cp database/compliance.backup.db database/compliance.db

   # Or rebuild from scratch
   npx prisma db push --force-reset
   # Re-import your data
   ```

---

## Maintenance & Monitoring

### Monthly Tasks

1. **Review learning progress**:
```bash
npx tsx src/scripts/analyze-learning-progress.ts
```

2. **Check for new policy templates**:
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const templates = await prisma.m365Policy.groupBy({
  by: ['odataType'],
  _count: true
});

console.log('Policy templates in use:');
templates.forEach(t => {
  console.log(\`  \${t.odataType}: \${t._count} policies\`);
});

await prisma.\$disconnect();
"
```

3. **Audit false positives**:
   - Review compliance checks with unexpected values
   - Correct any incorrect settingName mappings

### When Microsoft Updates APIs

1. Monitor Microsoft Graph API changelog
2. Test new policy types with sandbox tenant
3. Update specialized extractors if needed
4. Let learning system adapt naturally

---

## Conclusion

This guide provides 5 approaches to improve policy matching, from quick pattern-based fixes to long-term learning systems.

**Recommended path**: Start with Phase 1 for immediate gains, then Phase 2 for targeted improvement, and finally Phase 3 for continuous optimization.

**Expected outcome**: Improve from 5.5% to 40-60% match rate over 1-3 months, significantly increasing the value of the policy viewer and compliance tracking.

---

## Additional Resources

### Helper Scripts Location
- `server/src/scripts/` - All analysis and rebuild scripts
- `server/src/lib/` - Shared utilities (create for extractors)

### Database Schema
- `server/prisma/schema.prisma` - M365Setting model has learning fields

### Current Extraction Logic
- `server/src/scripts/rebuild-compliance-checks.ts` - Main extraction logic
- Line 126-181: `extractActualValue()` function

### API Endpoints
- `server/src/services/policyViewer.service.ts` - Policy viewer service
- `server/src/routes/m365.routes.ts` - Control mappings endpoint

---

**Last Updated**: 2025-11-20
**Current Match Rate**: 5.5% (25/456 settings)
**Current Controls**: 8 verified, 43 potential (Intune)
