# Microsoft 365 Policy Mappings to NIST 800-171 Controls - Reference Guide

**Last Updated:** 2025-11-16
**NIST Revision:** 3 (May 2024)
**Total Controls:** 97

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Components](#architecture--components)
3. [Database Schema](#database-schema)
4. [Data Files](#data-files)
5. [Services & Business Logic](#services--business-logic)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Type Definitions](#type-definitions)
9. [Mapping Strategies](#mapping-strategies)
10. [Policy Types](#policy-types)
11. [Confidence Levels](#confidence-levels)
12. [Gap Analysis](#gap-analysis)
13. [Auto-Mapping Process](#auto-mapping-process)
14. [Manual Mapping Workflow](#manual-mapping-workflow)

---

## Overview

The M365 Policy Mapping system establishes relationships between **NIST 800-171 Rev 3 controls** and **Microsoft 365 policies** (Intune, Purview, Azure AD). This enables:

- Automated compliance assessment
- Gap analysis and remediation tracking
- Policy-based control coverage validation
- Improvement action recommendations

### Key Features

- **Keyword-based auto-mapping** - Automatically map policies to controls using intelligent keyword matching
- **Settings-level validation** - Validate individual policy settings against NIST requirements
- **Multi-platform support** - Handle Intune, Purview, and Azure AD policies
- **Platform-aware mapping** - Track compliance across Windows, iOS, Android, macOS
- **Confidence scoring** - Rate mapping quality as High/Medium/Low
- **Gap analysis** - Identify missing or non-compliant settings

---

## Architecture & Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     M365 POLICY MAPPING SYSTEM                  │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Data Sources    │────▶│  Services Layer  │────▶│  Database Layer  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
│                        │                        │
│ - M365 Tenant          │ - settingsMapper       │ - M365Policy
│ - Graph API            │ - policySync           │ - Control
│ - JSON Config          │ - improvementAction    │ - ControlPolicyMapping
│                        │ - policyViewer         │
│                        │                        │
└────────────────────────┴────────────────────────┴──────────────────

                              │
                              ▼
                    ┌──────────────────┐
                    │  API Routes      │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Frontend UI     │
                    └──────────────────┘
                    │
                    │ - M365SettingsTab
                    │ - M365RecommendationsTab
                    │ - GapAnalysisTab
```

---

## Database Schema

### Table: `m365_policies`

Stores synced Microsoft 365 policies from the tenant.

```prisma
model M365Policy {
  id                Int      @id @default(autoincrement())
  policyType        String   // 'Intune' | 'Purview' | 'AzureAD'
  policyId          String   @unique // External ID from M365
  policyName        String
  policyDescription String?
  policyData        String   // JSON string of full policy object
  lastSynced        DateTime @default(now())
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  controlMappings   ControlPolicyMapping[]
}
```

**Key Fields:**
- `policyType`: Categorizes as Intune, Purview, or AzureAD
- `policyData`: Full JSON policy object from Microsoft Graph API
- `lastSynced`: Timestamp of last sync from M365 tenant

---

### Table: `control_policy_mappings`

Links controls to policies with confidence scoring and settings validation.

```prisma
model ControlPolicyMapping {
  id                Int      @id @default(autoincrement())
  controlId         Int      // FK to Control
  policyId          Int      // FK to M365Policy
  mappingConfidence String   @default("Medium") // 'High' | 'Medium' | 'Low'
  mappingNotes      String?
  mappedSettings    String?  // JSON array of settings that map to control
  isAutoMapped      Boolean  @default(true) // Auto vs manual mapping
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  control           Control    @relation(...)
  policy            M365Policy @relation(...)

  @@unique([controlId, policyId])
}
```

**Key Fields:**
- `mappingConfidence`: Quality rating of the mapping
- `mappedSettings`: JSON array of specific settings that contribute to control satisfaction
- `isAutoMapped`: Distinguishes between auto-generated and manually created mappings

**Example `mappedSettings` JSON:**
```json
[
  {
    "settingName": "passwordMinimumLength",
    "settingValue": 14,
    "meetsRequirement": true,
    "requiredValue": 14,
    "validationType": "numeric",
    "validationMessage": "Value meets minimum requirement of 14"
  }
]
```

---

## Data Files

### 1. `/data/control-m365-mappings.json`

Static mappings defining **which policy types** can satisfy each control and **search criteria** for auto-mapping.

**Structure:**
```json
{
  "version": "NIST SP 800-171 Revision 3",
  "lastUpdated": "2024-11-14",
  "totalControls": 97,
  "description": "Mappings between NIST 800-171 Rev 3 controls and Microsoft 365 policies",
  "mappings": [
    {
      "controlId": "03.01.01",
      "controlTitle": "Account Management",
      "policyTypes": ["AzureAD", "Intune"],
      "searchCriteria": {
        "policyTypeMatch": "ConditionalAccess",
        "keywords": ["account", "user", "provisioning", "lifecycle"]
      },
      "mappingConfidence": "High",
      "mappingReason": "Conditional Access and user management policies directly control account lifecycle"
    }
  ]
}
```

**Location:** `data/control-m365-mappings.json`
**Purpose:** High-level policy type mappings and search keywords for automated discovery

---

### 2. `/data/control-settings-mappings.json`

Advanced **keyword-based settings mappings** with validation rules and compliance metadata.

**Structure:**
```json
{
  "version": "NIST SP 800-171 Revision 3 (Enhanced)",
  "lastUpdated": "2025-11-15",
  "mappingStrategy": "keyword-based",
  "controls": [
    {
      "controlId": "03.01.01",
      "controlTitle": "Account Management",
      "priority": "Critical",
      "settingsMappings": [
        {
          "id": "03.01.01-001",
          "description": "Conditional Access state enforcement",
          "policyTypes": ["AzureAD"],
          "searchStrategy": {
            "mode": "keyword",
            "settingNameKeywords": ["state"],
            "settingPathPatterns": ["*.state"],
            "excludeKeywords": []
          },
          "validation": {
            "expectedValue": ["enabled", "enabledForReportingButNotEnforced"],
            "operator": "in",
            "dataType": "string",
            "allowedValues": ["enabled", "enabledForReportingButNotEnforced"]
          },
          "compliance": {
            "confidence": "High",
            "nistRequirement": "Enforce access controls through Conditional Access",
            "rationale": "Enabled Conditional Access policies enforce account management controls"
          }
        }
      ]
    }
  ]
}
```

**Location:** `data/control-settings-mappings.json`
**Purpose:** Granular settings-level validation with search strategies and compliance requirements

---

## Services & Business Logic

### 1. `settingsMapper.service.ts`

**Primary mapping service** - Maps individual M365 policy settings to NIST controls.

**Location:** `server/src/services/settingsMapper.service.ts`

**Key Methods:**

#### `loadMappingLibrary()`
Loads settings mapping library from `control-settings-mappings.json`. Detects whether to use keyword-based or legacy mapping structure.

```typescript
loadMappingLibrary(): SettingsMappingLibrary
```

#### `mapPolicySettings(policy: PolicyMappingInput)`
Maps all settings in a single policy to relevant controls.

```typescript
mapPolicySettings(policy: PolicyMappingInput): PolicyMappingOutput
```

**Input:**
```typescript
{
  policyId: number,
  policyExternalId: string,
  policyName: string,
  policyType: 'Intune' | 'Purview' | 'AzureAD',
  settings: { [settingName: string]: any }
}
```

**Output:**
```typescript
{
  policyId: number,
  controlMappings: ControlMappingResult[]
}
```

#### `mapAllPolicies()`
**Main auto-mapping function** - Maps all policies in database to controls. Deletes old auto-mapped records and creates new ones.

```typescript
async mapAllPolicies(): Promise<SettingsMappingStats>
```

**Process:**
1. Load keyword-based mappings
2. Fetch all M365 policies from database
3. Delete existing auto-mapped records
4. For each control with settings mappings:
   - Search for matching settings using keywords
   - Validate setting values
   - Calculate compliance percentage
   - Determine confidence level
5. Insert new mappings into database
6. Return statistics

**Returns:**
```typescript
{
  totalPolicies: number,
  totalMappingsCreated: number,
  mappingsByConfidence: { High: number, Medium: number, Low: number },
  controlsCovered: number,
  settingsMatched: number,
  duration: number
}
```

#### `searchSettingsByKeywords(policyTypes, searchStrategy)`
Searches for settings in policies using keyword matching.

```typescript
private async searchSettingsByKeywords(
  policyTypes: string[],
  searchStrategy: {
    mode: string;
    settingNameKeywords: string[];
    settingPathPatterns?: string[];
    excludeKeywords?: string[];
  }
): Promise<Array<{
  policyId: number;
  policyName: string;
  policyType: string;
  settingName: string;
  settingValue: any;
  matchScore: number;
}>>
```

**Features:**
- Searches nested policy settings
- Supports keyword matching with scoring
- Path pattern matching (e.g., `*.state`)
- Exclude keywords to avoid false positives
- Returns match score based on keyword coverage

#### `validateSettingValue(actualValue, validation)`
Validates a setting value against expected criteria.

```typescript
private validateSettingValue(
  actualValue: any,
  validation: {
    expectedValue: any;
    operator: '==' | '>=' | '<=' | '>' | '<' | 'contains' | 'matches' | 'in';
    dataType: 'boolean' | 'integer' | 'string' | 'array' | 'object';
    allowedValues?: any[];
  }
): { isCompliant: boolean; message: string }
```

**Supported Operators:**
- `==` - Exact equality
- `>=`, `<=`, `>`, `<` - Numeric comparisons
- `contains` - Array/string containment
- `in` - Value in allowed list
- `matches` - Regex pattern matching

#### `validateControlSettings(controlId)`
Validates all settings for a specific control using keyword-based search.

```typescript
async validateControlSettings(controlId: string)
```

**Returns:**
```typescript
{
  controlId: string,
  controlTitle: string,
  priority: 'Critical' | 'High' | 'Medium' | 'Low',
  hasSettings: boolean,
  totalMappings: number,
  validationResults: [{
    mappingId: string,
    description: string,
    settingsFound: number,
    results: [{
      policyId: number,
      policyName: string,
      settingName: string,
      settingValue: any,
      expectedValue: any,
      isCompliant: boolean,
      validationMessage: string,
      confidence: string,
      matchScore: number
    }]
  }]
}
```

#### `getGapAnalysis()`
Generates comprehensive gap analysis showing controls with missing or non-compliant settings.

```typescript
async getGapAnalysis()
```

**Returns:**
```typescript
{
  totalControls: number,
  controlsFullyCovered: number,
  controlsPartiallyCovered: number,
  controlsNotCovered: number,
  coveragePercentage: number,
  gaps: [{
    id: number,
    controlId: string,
    controlTitle: string,
    family: string,
    priority: 'Critical' | 'High' | 'Medium' | 'Low',
    gapType: 'NoSettings' | 'NonCompliantSettings',
    affectedPolicies: [{
      policyId: number,
      policyName: string,
      nonCompliantSettings: MappedSetting[]
    }],
    recommendedActions: string[]
  }]
}
```

**Gap Types:**
- `NoSettings`: No M365 settings currently satisfy this control
- `NonCompliantSettings`: Settings exist but don't meet requirements

#### `getRecommendations(controlId)`
Get M365 implementation recommendations for a specific control with satisfaction status.

```typescript
async getRecommendations(controlId: string)
```

**Returns:**
```typescript
{
  controlId: string,
  controlTitle: string,
  family: string,
  hasRecommendations: boolean,
  totalRecommendations: number,
  satisfiedCount: number,
  recommendations: [{
    settingNames: string[],
    settingDisplayName: string,
    validationType: string,
    requiredValue: any,
    policyTypes: string[],
    policySubType: string,
    description: string,
    contextualHelp: string,
    isSatisfied: boolean,
    satisfiedBy?: {
      settingName: string,
      settingValue: any,
      policyName: string,
      policyType: string
    }
  }],
  microsoftImprovementActions: []
}
```

---

### 2. `policySync.service.ts`

**Policy synchronization service** - Fetches policies from M365 tenant and triggers auto-mapping.

**Location:** `server/src/services/policySync.service.ts`

**Key Methods:**

#### `syncAllPolicies(forceRefresh)`
Main sync function that fetches policies from M365 and updates database.

```typescript
async syncAllPolicies(forceRefresh: boolean = false): Promise<SyncResult>
```

**Process:**
1. Fetch policies from Intune, Purview, Azure AD
2. Upsert policies into `m365_policies` table
3. Trigger auto-mapping via `settingsMapperService.mapAllPolicies()`
4. Log sync results to `m365_sync_logs`

---

### 3. `improvementActionMapping.service.ts`

**Improvement action mapping service** - Maps Microsoft improvement actions to policies and calculates implementation status.

**Location:** `server/src/services/improvementActionMapping.service.ts`

**Key Methods:**

#### `getImprovementActionsWithPolicies(controlId)`
Get improvement actions with policy mappings showing which policies satisfy each action.

```typescript
async getImprovementActionsWithPolicies(controlId: string)
```

**Returns:**
```typescript
[{
  title: string,
  category: string,
  priority: 'Critical' | 'High' | 'Medium' | 'Low',
  description: string,
  status: 'Completed' | 'InProgress' | 'NotStarted',
  requiredPlatforms: ['Windows', 'iOS', 'Android', 'macOS'],
  platformsRequired: number,
  platformsCompleted: number,
  totalPolicies: number,
  compliantPolicies: number,
  platformCoverage: [{
    platform: string,
    platformStatus: 'Completed' | 'InProgress' | 'NotStarted',
    hasPolicies: boolean,
    totalPoliciesCount: number,
    compliantPoliciesCount: number
  }],
  satisfiedBy: [{
    policyId: string,
    policyName: string,
    policyType: string,
    platform: string,
    overallCompliance: number,
    settings: [{
      settingName: string,
      currentValue: any,
      requiredValue: any,
      meetsRequirement: boolean
    }]
  }]
}]
```

---

### 4. `policyViewer.service.ts`

**Policy viewer service** - Provides formatted policy data for viewing and searching.

**Location:** `server/src/services/policyViewer.service.ts`

**Key Methods:**

#### `getPolicies(params: PolicySearchParams)`
Get policies with search/filter/sort capabilities.

```typescript
async getPolicies(params: PolicySearchParams)
```

**Search Parameters:**
```typescript
{
  policyType?: 'Intune' | 'Purview' | 'AzureAD',
  searchTerm?: string,
  isActive?: boolean,
  controlId?: string,
  sortBy?: 'name' | 'type' | 'lastSynced',
  sortOrder?: 'asc' | 'desc'
}
```

---

## API Endpoints

### M365 Routes (`/api/m365/*`)

**Location:** `server/src/routes/m365.routes.ts`

#### Policy Sync

```
POST /api/m365/sync
```
Trigger manual sync of M365 policies.

**Request Body:**
```json
{
  "forceRefresh": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sync completed",
  "result": {
    "totalPolicies": 150,
    "totalMappingsCreated": 320,
    "mappingsByConfidence": {
      "High": 120,
      "Medium": 150,
      "Low": 50
    },
    "controlsCovered": 65,
    "settingsMatched": 450,
    "duration": 5234
  }
}
```

---

#### Gap Analysis

```
GET /api/m365/gap-analysis
```
Get comprehensive gap analysis showing controls with missing or non-compliant settings.

**Response:**
```json
{
  "success": true,
  "analysis": {
    "totalControls": 97,
    "controlsFullyCovered": 45,
    "controlsPartiallyCovered": 30,
    "controlsNotCovered": 22,
    "coveragePercentage": 77.3,
    "gaps": [...]
  }
}
```

---

#### Recommendations

```
GET /api/m365/recommendations/:controlId
```
Get M365 implementation recommendations for a specific control.

**Example:** `GET /api/m365/recommendations/03.01.01`

**Response:**
```json
{
  "success": true,
  "recommendations": {
    "controlId": "03.01.01",
    "controlTitle": "Account Management",
    "hasRecommendations": true,
    "totalRecommendations": 5,
    "satisfiedCount": 3,
    "recommendations": [...]
  }
}
```

---

#### Improvement Actions

```
GET /api/m365/improvement-actions/:controlId
```
Get improvement actions with policy mappings showing which policies satisfy each action.

**Example:** `GET /api/m365/improvement-actions/03.07.03`

**Response:**
```json
{
  "success": true,
  "controlId": "03.07.03",
  "count": 2,
  "actions": [
    {
      "title": "Require MFA for all users",
      "category": "Identity",
      "priority": "High",
      "status": "InProgress",
      "platformsRequired": 0,
      "platformsCompleted": 0,
      "totalPolicies": 3,
      "compliantPolicies": 2,
      "satisfiedBy": [...]
    }
  ]
}
```

---

#### Policy Viewer

```
GET /api/m365/policies/viewer
```
Get policies with detailed formatting for viewer.

**Query Parameters:**
- `policyType`: Filter by Intune/Purview/AzureAD
- `searchTerm`: Search policy names/descriptions
- `isActive`: Filter by active status
- `controlId`: Filter by mapped control
- `sortBy`: Sort field
- `sortOrder`: asc/desc

---

### Control Routes (`/api/controls/*`)

#### Get Control Policies

```
GET /api/controls/:controlId/policies
```
Get all policies mapped to a specific control with settings details.

**Example:** `GET /api/controls/03.01.01/policies`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "policyId": "abc123",
      "policyName": "Windows 10 - Account Management",
      "policyType": "Intune",
      "mappingConfidence": "High",
      "mappedSettings": [
        {
          "settingName": "passwordMinimumLength",
          "settingValue": 14,
          "meetsRequirement": true,
          "requiredValue": 14,
          "validationType": "numeric",
          "validationMessage": "Value meets minimum requirement of 14"
        }
      ]
    }
  ]
}
```

---

## Frontend Components

### 1. `M365SettingsTab.tsx`

**Purpose:** Displays M365 policy settings mapped to a control.

**Location:** `client/src/components/controls/M365SettingsTab.tsx`

**Features:**
- Shows all policies mapped to the control
- Displays individual settings with compliance status
- Color-coded by policy type (Intune/Purview/AzureAD)
- Confidence level badges
- Compliance percentage indicators
- Link to policy viewer for full details

**Usage:**
```tsx
<M365SettingsTab control={control} />
```

**UI Components:**
- Summary statistics (mapped policies, total settings, compliant settings)
- Policy cards grouped by type
- Settings list with validation status
- View Policy button links to Policy Viewer

---

### 2. `M365RecommendationsTab.tsx`

**Purpose:** Shows implementation recommendations and improvement actions for a control.

**Location:** `client/src/components/controls/M365RecommendationsTab.tsx`

**Features:**
- Settings recommendations grouped by policy type
- Satisfaction status (checkmarks for already configured settings)
- Improvement actions with policy-based status
- Platform coverage tracking (Windows, iOS, Android, macOS)
- Collapsible policy details
- Implementation guidance

**Usage:**
```tsx
<M365RecommendationsTab control={control} />
```

**UI Sections:**

1. **Settings Recommendations**
   - Total recommendations count
   - Already satisfied vs needs configuration
   - Grouped by policy type (Intune, Purview, AzureAD)
   - Each recommendation shows:
     - Setting name and display name
     - Policy sub-type
     - Description and contextual help
     - Required value
     - Satisfaction status
     - Current policy satisfying it (if applicable)

2. **Improvement Actions**
   - Policy-based implementation status
   - Platform-specific compliance tracking
   - Collapsible policy details showing:
     - Policy name and type
     - Platform
     - Compliance percentage
     - Individual settings validation
   - Missing platform coverage warnings

3. **Implementation Guide**
   - How to configure Intune policies
   - How to configure Purview policies
   - How to configure Azure AD policies

---

## Type Definitions

### Server Types (`server/src/types/settingsMapper.types.ts`)

#### `SettingsMappingLibrary`
```typescript
interface SettingsMappingLibrary {
  $schema: string;
  version: string;
  lastUpdated: string;
  description: string;
  controls: {
    [controlId: string]: ControlMappingDefinition;
  };
}
```

#### `ControlMappingDefinition`
```typescript
interface ControlMappingDefinition {
  controlId: string; // e.g., "03.05.07"
  title: string;
  family: string; // AC, IA, SC, etc.
  settingMappings: SettingMapping[];
}
```

#### `SettingMapping`
```typescript
interface SettingMapping {
  settingNames: string[]; // Array of synonyms
  settingDisplayName?: string;
  validationType: ValidationRuleType;
  requiredValue: ValidationRule;
  policyTypes: ('Intune' | 'Purview' | 'AzureAD')[];
  policySubType?: string;
  description: string;
  contextualHelp?: string;
}
```

#### `ControlSettingsMapping` (Keyword-based)
```typescript
interface ControlSettingsMapping {
  controlId: string;
  controlTitle: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  settingsMappings: SettingsMapping[];
}
```

#### `SettingsMapping`
```typescript
interface SettingsMapping {
  id: string;
  description: string;
  policyTypes: string[];
  searchStrategy: SettingsSearchStrategy;
  validation: SettingsValidation;
  compliance: SettingsCompliance;
}
```

#### `SettingsSearchStrategy`
```typescript
interface SettingsSearchStrategy {
  mode: 'keyword';
  settingNameKeywords: string[];
  settingPathPatterns?: string[];
  excludeKeywords?: string[];
}
```

#### `SettingsValidation`
```typescript
interface SettingsValidation {
  expectedValue: any;
  operator: '==' | '>=' | '<=' | '>' | '<' | 'contains' | 'matches' | 'in';
  dataType: 'boolean' | 'integer' | 'string' | 'array' | 'object';
  allowedValues?: any[];
}
```

#### `MappedSetting`
```typescript
interface MappedSetting {
  settingName: string;
  settingValue: any;
  meetsRequirement: boolean;
  requiredValue?: any;
  validationType?: string;
  validationMessage?: string;
}
```

#### `ControlMappingResult`
```typescript
interface ControlMappingResult {
  controlId: string;
  controlTitle: string;
  mappedSettings: MappedSetting[];
  overallConfidence: number; // 0-100
  confidenceLevel: 'High' | 'Medium' | 'Low';
  mappingNotes: string;
}
```

---

### Shared Types (`shared/types/m365.types.ts`)

#### `PolicyType`
```typescript
type PolicyType = 'Intune' | 'Purview' | 'AzureAD';
```

#### `MappingConfidence`
```typescript
type MappingConfidence = 'High' | 'Medium' | 'Low';
```

#### `ControlPolicyMappingDTO`
```typescript
interface ControlPolicyMappingDTO {
  id: number;
  controlId: string; // "03.01.01" format
  controlTitle: string;
  policyId: number;
  policyName: string;
  policyType: PolicyType;
  mappingConfidence: MappingConfidence;
  mappingNotes?: string;
}
```

---

## Mapping Strategies

The system supports two mapping strategies:

### 1. **Legacy Object-Based Mapping** (Deprecated)

Uses direct object key matching for settings.

**Structure:**
```json
{
  "controls": {
    "03.01.01": {
      "controlId": "03.01.01",
      "settingMappings": [...]
    }
  }
}
```

### 2. **Keyword-Based Mapping** (Current)

Uses intelligent keyword search with nested settings support.

**Features:**
- Searches nested Settings Catalog arrays
- Supports keyword matching with scoring
- Path pattern matching (e.g., `*.state`)
- Exclude keywords to avoid false positives
- Validation operators for complex requirements

**Structure:**
```json
{
  "mappingStrategy": "keyword-based",
  "controls": [
    {
      "controlId": "03.01.01",
      "settingsMappings": [
        {
          "searchStrategy": {
            "mode": "keyword",
            "settingNameKeywords": ["password", "length"],
            "excludeKeywords": ["history"]
          },
          "validation": {
            "expectedValue": 14,
            "operator": ">=",
            "dataType": "integer"
          }
        }
      ]
    }
  ]
}
```

**Keyword Matching Algorithm:**
1. Normalize keywords to lowercase
2. Search through all policy settings (including nested)
3. Calculate match score: `matchedKeywords / totalKeywords`
4. Require minimum threshold (50% for 3+ keywords, 100% for 1-2 keywords)
5. Check path patterns if specified
6. Exclude if any exclude keywords match
7. Return matches sorted by score

---

## Policy Types

### 1. **Intune Policies**

**Purpose:** Device management and security configuration

**Policy Types:**
- Device Compliance Policies
- Device Configuration Policies
- Endpoint Security Policies
- App Protection Policies
- Update Policies
- Settings Catalog Policies

**Common Settings:**
- Password requirements
- Device encryption
- Screen lock timeout
- Application restrictions
- Update enforcement

**Example Setting Extraction:**

Legacy policies have settings at root level:
```json
{
  "id": "policy-123",
  "displayName": "Windows Compliance",
  "passwordMinimumLength": 14,
  "passwordRequired": true
}
```

Settings Catalog policies use nested arrays:
```json
{
  "id": "policy-456",
  "displayName": "Windows Security Baseline",
  "settings": [
    {
      "settingInstance": {
        "settingDefinitionId": "device_vendor_msft_policy_config_DevicePasswordMinimumLength",
        "simpleSettingValue": {
          "value": 14
        }
      }
    }
  ]
}
```

The `extractPolicySettings()` function handles both formats.

---

### 2. **Purview Policies**

**Purpose:** Data Loss Prevention and information protection

**Policy Types:**
- DLP Policies
- Sensitivity Labels
- Retention Policies
- Information Barriers

**Common Settings:**
- DLP mode (Test/Enabled)
- Allowed sharing locations
- Label sensitivity level
- Retention duration

**Example Settings:**
```json
{
  "dlpMode": "Enabled",
  "enabled": true,
  "locations": ["SharePoint", "OneDrive", "Exchange"]
}
```

---

### 3. **Azure AD Policies**

**Purpose:** Identity and access management

**Policy Types:**
- Conditional Access Policies
- Authentication Methods Policies
- Identity Protection Policies

**Common Settings:**
- Grant controls (MFA, compliant device, approved app)
- Session controls (sign-in frequency, persistent browser session)
- Conditions (user/group, location, device platform, risk level)

**Example Settings:**
```json
{
  "state": "enabled",
  "conditions": {
    "users": { "includeUsers": ["All"] },
    "applications": { "includeApplications": ["All"] }
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["mfa"]
  }
}
```

---

## Confidence Levels

Mappings are assigned confidence levels based on compliance percentage:

### High Confidence (≥ 80%)
- 80%+ of required settings meet requirements
- Strong correlation between policy and control
- Recommended for automated compliance reporting

### Medium Confidence (50-79%)
- 50-79% of required settings meet requirements
- Partial control satisfaction
- May require additional policies or manual controls

### Low Confidence (< 50%)
- < 50% of required settings meet requirements
- Weak correlation or mostly non-compliant
- Significant gaps remain

**Confidence Calculation:**
```typescript
function calculateConfidenceLevel(compliancePercentage: number): MappingConfidence {
  if (compliancePercentage >= 80) return 'High';
  if (compliancePercentage >= 50) return 'Medium';
  return 'Low';
}
```

---

## Gap Analysis

### Gap Types

#### 1. **NoSettings**
No M365 settings currently satisfy this control.

**Recommended Actions:**
- Lists suggested M365 settings to configure
- Identifies which policy types to create
- May recommend procedural controls if no technical controls available

**Example:**
```
Control 03.02.01 - Literacy Training and Awareness
Gap Type: NoSettings
Recommended Actions:
  - No Microsoft 365 settings currently satisfy this control
  - Consider manual policy configuration or procedural controls
```

#### 2. **NonCompliantSettings**
Settings exist but don't meet NIST requirements.

**Recommended Actions:**
- Specific remediation for each non-compliant setting
- Policy name and required value changes
- Step-by-step configuration guidance

**Example:**
```
Control 03.01.08 - Unsuccessful Logon Attempts
Gap Type: NonCompliantSettings
Affected Policies:
  - Windows 10 Compliance Policy
    - accountLockoutThreshold: 10 (required: ≤ 5)
Recommended Actions:
  - Update policy "Windows 10 Compliance Policy":
    Change "accountLockoutThreshold" from "10" to "5"
```

### Priority Levels

Controls are prioritized for gap remediation:

#### Critical Priority
**Families:** AC (Access Control), IA (Identification & Authentication), SC (System & Communications Protection)

**Examples:**
- 03.01.01 - Account Management
- 03.07.03 - Multi-Factor Authentication
- 03.13.11 - Cryptographic Protection

#### High Priority
**Families:** AU (Audit), CM (Configuration Management), SI (System Integrity), IR (Incident Response)

**Examples:**
- 03.03.01 - Event Logging
- 03.05.01 - Baseline Configuration
- 03.14.02 - Malicious Code Protection

#### Medium Priority
**Families:** AT (Awareness & Training), MA (Maintenance), MP (Media Protection), PS (Personnel Security), PE (Physical Protection)

**Examples:**
- 03.02.01 - Literacy Training
- 03.10.02 - Media Access
- 03.11.01 - Position Risk Designation

#### Low Priority
**Families:** RA (Risk Assessment), SA (System & Services Acquisition), PL (Planning)

**Examples:**
- 03.12.01 - Risk Assessment
- 03.15.01 - Policy and Procedures
- 03.16.01 - Security Engineering Principles

---

## Auto-Mapping Process

The auto-mapping process runs when:
1. Manual sync triggered via `/api/m365/sync`
2. Policies imported from M365 tenant
3. Settings mapping library updated

### Process Flow

```
1. Load Keyword-Based Mappings
   └─ Read control-settings-mappings.json
   └─ Parse controls and search strategies

2. Fetch All M365 Policies
   └─ Query m365_policies table
   └─ Parse policyData JSON

3. Delete Old Auto-Mapped Records
   └─ DELETE FROM control_policy_mappings WHERE isAutoMapped = true

4. For Each Control with Settings Mappings:

   A. Search for Matching Settings
      └─ For each settingsMapping in control:
         └─ searchSettingsByKeywords(policyTypes, searchStrategy)
            └─ Get all policies of specified types
            └─ Extract settings using extractPolicySettings()
            └─ Find matching settings via findMatchingSettings()
               └─ Recursive search through nested objects
               └─ Keyword matching with scoring
               └─ Path pattern matching
               └─ Exclude keyword filtering
            └─ Return matched settings with scores

   B. Validate Setting Values
      └─ For each matched setting:
         └─ validateSettingValue(actualValue, expectedValue, operator)
            └─ Type conversion based on dataType
            └─ Comparison using operator (==, >=, contains, etc.)
            └─ Return isCompliant and validationMessage

   C. Calculate Compliance & Confidence
      └─ Group matched settings by policy
      └─ Calculate compliance percentage per policy
      └─ Determine confidence level (High/Medium/Low)
      └─ Generate mapping notes

   D. Create Mapping Records
      └─ For each policy with matched settings:
         └─ INSERT INTO control_policy_mappings
            (controlId, policyId, mappingConfidence,
             mappingNotes, mappedSettings, isAutoMapped)

5. Return Statistics
   └─ Total policies analyzed
   └─ Mappings created
   └─ Mappings by confidence level
   └─ Controls covered
   └─ Settings matched
   └─ Duration
```

### Example Auto-Mapping Run

**Input:**
- 150 M365 policies in database
- 26 controls with keyword-based mappings
- 78 total settings mappings across controls

**Output:**
```json
{
  "totalPolicies": 150,
  "totalMappingsCreated": 320,
  "mappingsByConfidence": {
    "High": 120,
    "Medium": 150,
    "Low": 50
  },
  "controlsCovered": 65,
  "settingsMatched": 450,
  "duration": 5234
}
```

**Interpretation:**
- Analyzed 150 policies
- Created 320 control-to-policy mappings
- 120 high-confidence mappings (80%+ compliance)
- Covered 65 out of 97 controls (67%)
- Matched 450 individual settings
- Completed in 5.2 seconds

---

## Manual Mapping Workflow

While auto-mapping covers most scenarios, manual mappings may be needed for:
- Custom organizational policies
- Procedural controls without technical enforcement
- Complex controls requiring multiple policy types
- Controls with nuanced requirements not captured by keywords

### Creating Manual Mappings

**Method 1: Direct Database Insert**
```sql
INSERT INTO control_policy_mappings
  (control_id, policy_id, mapping_confidence, mapping_notes, is_auto_mapped)
VALUES
  (42, 123, 'High', 'Manually mapped custom policy', false);
```

**Method 2: Via API (Future Enhancement)**
```
POST /api/m365/mappings
{
  "controlId": "03.01.01",
  "policyId": 123,
  "mappingConfidence": "High",
  "mappingNotes": "Custom organizational policy",
  "mappedSettings": [...]
}
```

### Approving/Rejecting Auto-Mapped Suggestions

**Approve Single Mapping:**
```
POST /api/m365/mappings/:id/approve
```

**Reject Single Mapping:**
```
DELETE /api/m365/mappings/:id
```

**Bulk Approve:**
```
POST /api/m365/mappings/bulk-approve
{
  "ids": [1, 2, 3, 4, 5]
}
```

**Bulk Reject:**
```
POST /api/m365/mappings/bulk-reject
{
  "ids": [6, 7, 8, 9, 10]
}
```

---

## Key Files Reference

| File Path | Purpose |
|-----------|---------|
| `server/prisma/schema.prisma` | Database schema for M365 policies and mappings |
| `server/src/services/settingsMapper.service.ts` | Core mapping logic and validation |
| `server/src/services/policySync.service.ts` | Policy synchronization from M365 tenant |
| `server/src/services/improvementActionMapping.service.ts` | Improvement action tracking |
| `server/src/services/policyViewer.service.ts` | Policy viewing and search |
| `server/src/routes/m365.routes.ts` | API routes for M365 operations |
| `server/src/types/settingsMapper.types.ts` | TypeScript types for mappings |
| `shared/types/m365.types.ts` | Shared types between client/server |
| `client/src/components/controls/M365SettingsTab.tsx` | UI for viewing mapped settings |
| `client/src/components/controls/M365RecommendationsTab.tsx` | UI for implementation recommendations |
| `data/control-m365-mappings.json` | Static policy type mappings |
| `data/control-settings-mappings.json` | Keyword-based settings mappings |

---

## Maintenance & Updates

### Adding New Settings Mappings

1. **Identify Control & Requirements**
   - Review NIST 800-171 control text
   - Identify specific technical requirements
   - Determine which M365 policy types can satisfy

2. **Define Search Strategy**
   - List relevant setting name keywords
   - Define path patterns if needed
   - Identify exclude keywords to avoid false positives

3. **Define Validation Rules**
   - Specify expected value
   - Choose appropriate operator
   - Set data type

4. **Add to `control-settings-mappings.json`**
   ```json
   {
     "id": "03.XX.YY-001",
     "description": "Clear description of what setting enforces",
     "policyTypes": ["Intune"],
     "searchStrategy": {
       "mode": "keyword",
       "settingNameKeywords": ["keyword1", "keyword2"],
       "excludeKeywords": ["exclude1"]
     },
     "validation": {
       "expectedValue": true,
       "operator": "==",
       "dataType": "boolean"
     },
     "compliance": {
       "confidence": "High",
       "nistRequirement": "Brief NIST requirement text",
       "rationale": "Why this setting satisfies the requirement"
     }
   }
   ```

5. **Test Mapping**
   - Trigger sync: `POST /api/m365/sync`
   - Verify in `M365SettingsTab`
   - Check gap analysis results

### Updating Confidence Thresholds

Edit `server/src/utils/validationHelpers.ts`:
```typescript
export function calculateConfidenceLevel(
  compliancePercentage: number
): MappingConfidence {
  if (compliancePercentage >= 80) return 'High';
  if (compliancePercentage >= 50) return 'Medium';
  return 'Low';
}
```

### Adding New Policy Types

1. Update `PolicyType` enum in `shared/types/m365.types.ts`
2. Create service in `server/src/services/` (e.g., `defender.service.ts`)
3. Add extraction logic to `extractPolicySettings()` in `settingsMapper.service.ts`
4. Update UI color mappings in frontend components

---

## Troubleshooting

### No Mappings Created After Sync

**Possible Causes:**
1. No policies in database
2. Keyword search not matching any settings
3. All settings failing validation

**Debug Steps:**
1. Check policy count: `SELECT COUNT(*) FROM m365_policies`
2. Review sync logs: `SELECT * FROM m365_sync_logs ORDER BY sync_date DESC LIMIT 5`
3. Test single control: `GET /api/m365/recommendations/03.01.01`
4. Check server console for keyword search results

### Low Confidence Mappings

**Possible Causes:**
1. Settings exist but values don't meet requirements
2. Partial implementation across policies
3. Incorrect keyword matching

**Remediation:**
1. Review non-compliant settings in `M365SettingsTab`
2. Update policy values in M365 admin portal
3. Refine keywords in `control-settings-mappings.json`
4. Re-sync after changes

### Settings Not Found

**Possible Causes:**
1. Settings Catalog policies not properly extracted
2. Keywords too specific or misspelled
3. Settings nested deeper than expected

**Debug Steps:**
1. Check raw policy data: `SELECT policy_data FROM m365_policies WHERE policy_name = 'XYZ'`
2. Test extraction: Add console.log in `extractPolicySettings()`
3. Broaden keywords or add path patterns
4. Check exclude keywords aren't filtering out valid matches

---

## Related Documentation

- [NIST 800-171 Rev 3 Controls](./ALL%20NIST%20REV%203%20CONTROLS.md)
- [Control Data Storage Locations](./CONTROL_DATA_STORAGE_LOCATIONS.md)
- [General Instructions](./instructions.md)

---

**Document Version:** 1.0
**Created:** 2025-11-16
**Last Updated:** 2025-11-16
**Maintained By:** Development Team
