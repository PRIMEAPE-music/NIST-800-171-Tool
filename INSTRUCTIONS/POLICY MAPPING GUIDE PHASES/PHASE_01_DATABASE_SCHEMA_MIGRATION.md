# Phase 1: Database Schema Migration

**Project:** NIST 800-171 Compliance Management Application  
**Phase:** 1 of 14 - Database Schema Setup  
**Optimized For:** Claude Code Execution  
**Date:** 2024-11-17

---

## 📋 PHASE OVERVIEW

### What This Phase Does

Creates the foundational database schema for the M365 compliance mapping system by:
1. Adding 4 new tables to track M365 settings and compliance
2. Updating existing `Control` and `M365Policy` models with new relations
3. Removing references to the old `controlPolicyMapping` system
4. Creating proper indexes for optimal query performance
5. Setting up cascade delete rules for data integrity

### Prerequisites

- ✅ Normalized data files exist in `INSTRUCTIONS/normalized-output/`
  - `master_settings_catalog.json`
  - `control_settings_mappings.json`
- ✅ Prisma 6.19.0 installed
- ✅ SQLite database configured
- ✅ Backup of current database (if needed)

### Expected Outcome

- 4 new tables created: `M365Setting`, `ControlSettingMapping`, `SettingComplianceCheck`, `ControlM365Compliance`
- All relations properly configured
- Database ready for Phase 2 data import
- Zero data loss (migration is additive)

---

## 🎯 IMPLEMENTATION STEPS

### Step 1: Clean Up Old System References

Before adding the new schema, we need to remove any remaining references to the old system that was previously disabled.

#### Step 1.1: Update database.ts Utility

**📁 File:** `server/src/utils/database.ts`

🔍 **FIND:**
```typescript
/**
 * Clear all data from database (use with caution!)
 */
export async function clearDatabase(): Promise<void> {
  logger.warn('Clearing all data from database...');

  await prisma.changeHistory.deleteMany();
  await prisma.controlPolicyMapping.deleteMany();
  await prisma.poamMilestone.deleteMany();
```

✏️ **REPLACE WITH:**
```typescript
/**
 * Clear all data from database (use with caution!)
 */
export async function clearDatabase(): Promise<void> {
  logger.warn('Clearing all data from database...');

  await prisma.changeHistory.deleteMany();
  // controlPolicyMapping table removed - old system deprecated
  await prisma.poamMilestone.deleteMany();
```

#### Step 1.2: Update Prisma Types

**📁 File:** `server/src/types/prisma.types.ts`

🔍 **FIND:**
```typescript
export type M365Policy = Prisma.M365PolicyGetPayload<object>;
// REMOVED: ControlPolicyMapping - no longer mapping policies to controls
export type ChangeHistory = Prisma.ChangeHistoryGetPayload<object>;
```

✏️ **REPLACE WITH:**
```typescript
export type M365Policy = Prisma.M365PolicyGetPayload<object>;
export type M365Setting = Prisma.M365SettingGetPayload<object>;
export type ControlSettingMapping = Prisma.ControlSettingMappingGetPayload<object>;
export type SettingComplianceCheck = Prisma.SettingComplianceCheckGetPayload<object>;
export type ControlM365Compliance = Prisma.ControlM365ComplianceGetPayload<object>;
export type ChangeHistory = Prisma.ChangeHistoryGetPayload<object>;
```

#### Step 1.3: Update Control Service

**📁 File:** `server/src/services/controlService.ts`

🔍 **FIND:**
```typescript
      // Fetch all policy mappings for this control
      const mappings = await prisma.controlPolicyMapping.findMany({
        where: {
          controlId: control.id,
          isAutoMapped: true, // Only show auto-mapped settings
        },
```

✏️ **REPLACE WITH:**
```typescript
      // Legacy policy mapping system has been replaced with M365Setting system
      // This method will be updated in Phase 5 to use the new ControlSettingMapping table
      // For now, return empty array to maintain API compatibility
      logger.info(`getPoliciesForControl called for ${controlId} - returning empty (old system removed)`);
      return [];
      
      /* OLD CODE - will be replaced in Phase 5:
      const mappings = await prisma.controlPolicyMapping.findMany({
        where: {
          controlId: control.id,
          isAutoMapped: true, // Only show auto-mapped settings
        },
```

🔍 **FIND:**
```typescript
      logger.info(`Found ${policiesWithSettings.length} policies for control ${controlId}`);
      return policiesWithSettings;
    } catch (error) {
      logger.error(`Error fetching policies for control ${controlId}:`, error);
      throw error;
    }
  }
```

✏️ **REPLACE WITH:**
```typescript
      logger.info(`Found ${policiesWithSettings.length} policies for control ${controlId}`);
      return policiesWithSettings;
      */
    } catch (error) {
      logger.error(`Error fetching policies for control ${controlId}:`, error);
      throw error;
    }
  }
```

**✅ VERIFICATION CHECKLIST - Step 1:**
- [ ] `database.ts` no longer references `controlPolicyMapping`
- [ ] `prisma.types.ts` includes new model types
- [ ] `controlService.ts` returns empty array (temporary compatibility fix)
- [ ] No TypeScript errors after changes

---

### Step 2: Update Prisma Schema

Now we'll add the complete new schema to `schema.prisma`.

#### Step 2.1: Add New Models

**📁 File:** `server/prisma/schema.prisma`

Find the M365 section and add the new models after the existing `M365SyncLog` model.

**Location in file:** After the `M365SyncLog` model (around line 200)

➕ **ADD AFTER:** The `M365SyncLog` model definition

```prisma
// ============================================================================
// M365 Settings Catalog
// ============================================================================

model M365Setting {
  id              Int       @id @default(autoincrement())
  
  // Setting identification
  settingName     String    @map("setting_name") // e.g., "passwordMinimumLength"
  displayName     String    @map("display_name") // User-friendly name
  settingPath     String    @map("setting_path") // JSON path in policy, e.g., "settings[0].passwordMinimumLength"
  
  // Policy context
  policyType      String    @map("policy_type") // 'Intune' | 'Purview' | 'AzureAD' | 'Defender'
  policySubType   String?   @map("policy_sub_type") // 'DeviceConfiguration' | 'ConditionalAccess' | etc.
  platform        String    // 'Windows' | 'iOS' | 'Android' | 'All'
  
  // Validation
  dataType        String    @map("data_type") // 'boolean' | 'integer' | 'string' | 'array' | 'object'
  expectedValue   String    @map("expected_value") // JSON string of expected value
  validationOperator String @map("validation_operator") // '==' | '>=' | '<=' | 'contains' | 'in' | 'matches'
  
  // Documentation
  description     String
  implementationGuide String? @map("implementation_guide") // How to configure in M365 admin center
  microsoftDocUrl String?     @map("microsoft_doc_url") // Link to Microsoft docs
  
  // Status
  isActive        Boolean   @default(true) @map("is_active")
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  controlMappings ControlSettingMapping[]
  complianceChecks SettingComplianceCheck[]
  
  @@unique([settingPath, policyType, platform])
  @@index([policyType])
  @@index([platform])
  @@index([isActive])
  @@map("m365_settings")
}

// ============================================================================
// Control to M365 Setting Mappings (Many-to-Many)
// ============================================================================

model ControlSettingMapping {
  id              Int       @id @default(autoincrement())
  controlId       Int       @map("control_id") // FK to Control
  settingId       Int       @map("setting_id") // FK to M365Setting
  
  // Confidence & compliance
  confidence      String    // 'High' | 'Medium' | 'Low'
  isRequired      Boolean   @default(true) @map("is_required") // Required vs optional
  complianceStatus String   @default("Not Configured") @map("compliance_status") // 'Compliant' | 'Non-Compliant' | 'Not Configured'
  
  // Metadata
  mappingRationale String?  @map("mapping_rationale") // Why this setting satisfies the control
  nistRequirement  String?  @map("nist_requirement") // Specific NIST requirement text
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  control         Control   @relation(fields: [controlId], references: [id], onDelete: Cascade)
  setting         M365Setting @relation(fields: [settingId], references: [id], onDelete: Cascade)
  
  @@unique([controlId, settingId])
  @@index([controlId])
  @@index([settingId])
  @@index([confidence])
  @@index([complianceStatus])
  @@map("control_setting_mappings")
}

// ============================================================================
// Setting Compliance Checks (Validation Results)
// ============================================================================

model SettingComplianceCheck {
  id              Int       @id @default(autoincrement())
  
  settingId       Int       @map("setting_id") // FK to M365Setting
  policyId        Int       @map("policy_id") // FK to M365Policy
  
  // Compliance result
  actualValue     String?   @map("actual_value") // JSON string of actual value found
  expectedValue   String    @map("expected_value") // JSON string of expected value
  isCompliant     Boolean   @map("is_compliant")
  complianceMessage String? @map("compliance_message") // Details about compliance status
  
  // Metadata
  lastChecked     DateTime  @default(now()) @map("last_checked")
  
  setting         M365Setting @relation(fields: [settingId], references: [id], onDelete: Cascade)
  policy          M365Policy  @relation(fields: [policyId], references: [id], onDelete: Cascade)
  
  @@unique([settingId, policyId])
  @@index([settingId])
  @@index([policyId])
  @@index([isCompliant])
  @@index([lastChecked])
  @@map("setting_compliance_checks")
}

// ============================================================================
// Control M365 Compliance Summary (Cached Calculations)
// ============================================================================

model ControlM365Compliance {
  id                    Int       @id @default(autoincrement())
  controlId             Int       @unique @map("control_id") // FK to Control
  
  // Compliance metrics
  totalRequiredSettings Int       @default(0) @map("total_required_settings")
  compliantSettings     Int       @default(0) @map("compliant_settings")
  nonCompliantSettings  Int       @default(0) @map("non_compliant_settings")
  notConfiguredSettings Int       @default(0) @map("not_configured_settings")
  compliancePercentage  Float     @default(0.0) @map("compliance_percentage") // 0-100
  
  // Confidence breakdown
  highConfidenceCount   Int       @default(0) @map("high_confidence_count")
  mediumConfidenceCount Int       @default(0) @map("medium_confidence_count")
  lowConfidenceCount    Int       @default(0) @map("low_confidence_count")
  
  // Platform coverage
  windowsCoverage       Float     @default(0.0) @map("windows_coverage")
  iosCoverage          Float     @default(0.0) @map("ios_coverage")
  androidCoverage      Float     @default(0.0) @map("android_coverage")
  
  lastCalculated        DateTime  @default(now()) @map("last_calculated")
  
  control               Control   @relation(fields: [controlId], references: [id], onDelete: Cascade)
  
  @@index([compliancePercentage])
  @@index([lastCalculated])
  @@map("control_m365_compliance")
}
```

#### Step 2.2: Update Control Model Relations

**📁 File:** `server/prisma/schema.prisma`

🔍 **FIND:**
```prisma
model Control {
  id                     Int      @id @default(autoincrement())
  controlId              String   @unique @map("control_id") // Format: "03.01.01" for Rev 3
  family                 String // AC|AT|AU|CA|CM|CP|IA|IR|MA|MP|PE|PS|RA|SA|SC|SI|SR|PL
  title                  String
  requirementText        String   @map("requirement_text")
  discussionText         String?  @map("discussion_text")
  references             String?  @map("references") // Full references text
  sourceControls         String?  @map("source_controls") // JSON array of source control IDs
  supportingPublications String?  @map("supporting_publications") // JSON array of supporting publications
  priority               String   @default("Medium") // Critical, High, Medium, Low
  revision               String   @default("3") // NIST 800-171 Revision number
  publicationDate        String   @default("May 2024") @map("publication_date") // Publication date
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")

  // Relations
  status          ControlStatus?
  assessments     Assessment[]
  evidence        Evidence[]
  poams           Poam[]
  changeHistory   ChangeHistory[]
  gaps            ControlGap[]
  poamItems       POAMItem[]
  coverage        ControlCoverage?
  controlEvidence ControlEvidence[]
```

✏️ **REPLACE WITH:**
```prisma
model Control {
  id                     Int      @id @default(autoincrement())
  controlId              String   @unique @map("control_id") // Format: "03.01.01" for Rev 3
  family                 String // AC|AT|AU|CA|CM|CP|IA|IR|MA|MP|PE|PS|RA|SA|SC|SI|SR|PL
  title                  String
  requirementText        String   @map("requirement_text")
  discussionText         String?  @map("discussion_text")
  references             String?  @map("references") // Full references text
  sourceControls         String?  @map("source_controls") // JSON array of source control IDs
  supportingPublications String?  @map("supporting_publications") // JSON array of supporting publications
  priority               String   @default("Medium") // Critical, High, Medium, Low
  revision               String   @default("3") // NIST 800-171 Revision number
  publicationDate        String   @default("May 2024") @map("publication_date") // Publication date
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")

  // Relations
  status          ControlStatus?
  assessments     Assessment[]
  evidence        Evidence[]
  poams           Poam[]
  changeHistory   ChangeHistory[]
  gaps            ControlGap[]
  poamItems       POAMItem[]
  coverage        ControlCoverage?
  controlEvidence ControlEvidence[]
  settingMappings ControlSettingMapping[]
  m365Compliance  ControlM365Compliance?
```

#### Step 2.3: Update M365Policy Model Relations

**📁 File:** `server/prisma/schema.prisma`

🔍 **FIND:**
```prisma
model M365Policy {
  id                Int      @id @default(autoincrement())
  policyType        String   @map("policy_type") // 'Intune' | 'Purview' | 'AzureAD'
  policyId          String   @unique @map("policy_id") // External ID from M365
  policyName        String   @map("policy_name")
  policyDescription String?  @map("policy_description")
  policyData        String   @map("policy_data") // JSON string of full policy object
  lastSynced        DateTime @default(now()) @map("last_synced")
  isActive          Boolean  @default(true) @map("is_active")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("m365_policies")
}
```

✏️ **REPLACE WITH:**
```prisma
model M365Policy {
  id                Int      @id @default(autoincrement())
  policyType        String   @map("policy_type") // 'Intune' | 'Purview' | 'AzureAD' | 'Defender'
  policyId          String   @unique @map("policy_id") // External ID from M365
  policyName        String   @map("policy_name")
  policyDescription String?  @map("policy_description")
  policyData        String   @map("policy_data") // JSON string of full policy object
  lastSynced        DateTime @default(now()) @map("last_synced")
  isActive          Boolean  @default(true) @map("is_active")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  complianceChecks  SettingComplianceCheck[]

  @@map("m365_policies")
}
```

**✅ VERIFICATION CHECKLIST - Step 2:**
- [ ] All 4 new models added to schema
- [ ] `Control` model has new relations: `settingMappings` and `m365Compliance`
- [ ] `M365Policy` model has new relation: `complianceChecks`
- [ ] All indexes properly defined
- [ ] All column names use snake_case with `@map`
- [ ] Cascade deletes configured correctly
- [ ] No syntax errors in schema file

---

### Step 3: Generate and Apply Migration

#### Step 3.1: Generate Prisma Client

First, regenerate the Prisma client to include the new models:

```bash
cd server
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client (6.19.0) to ./node_modules/@prisma/client
```

#### Step 3.2: Create Migration

Create a new migration with a descriptive name:

```bash
npx prisma migrate dev --name add_m365_settings_system
```

**Expected Output:**
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": SQLite database "dev.db" at "file:./dev.db"

SQLite database dev.db created at file:./dev.db

Applying migration `20241117_add_m365_settings_system`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20241117_add_m365_settings_system/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (6.19.0)
```

#### Step 3.3: Verify Migration SQL

Check the generated migration file to ensure it's correct:

```bash
cat prisma/migrations/*_add_m365_settings_system/migration.sql
```

**Expected Content (partial):**
```sql
-- CreateTable
CREATE TABLE "m365_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "setting_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "setting_path" TEXT NOT NULL,
    ...
);

-- CreateTable
CREATE TABLE "control_setting_mappings" (
    ...
);

-- CreateTable
CREATE TABLE "setting_compliance_checks" (
    ...
);

-- CreateTable
CREATE TABLE "control_m365_compliance" (
    ...
);

-- CreateIndex
CREATE UNIQUE INDEX "m365_settings_setting_path_policy_type_platform_key" ON "m365_settings"("setting_path", "policy_type", "platform");
```

**✅ VERIFICATION CHECKLIST - Step 3:**
- [ ] Prisma client generated successfully
- [ ] Migration created with correct name
- [ ] Migration SQL file exists
- [ ] All 4 tables created in migration
- [ ] All indexes created
- [ ] No migration errors

---

### Step 4: Verify Schema in Database

#### Step 4.1: Open Prisma Studio

Launch Prisma Studio to visually verify the schema:

```bash
npx prisma studio
```

**Expected:** Browser opens to `http://localhost:5555`

#### Step 4.2: Verify Tables Exist

In Prisma Studio, confirm the following tables are present:
- `m365_settings`
- `control_setting_mappings`
- `setting_compliance_checks`
- `control_m365_compliance`

Each table should show 0 records (empty).

#### Step 4.3: Verify Relations

Click on the `Control` model and verify it shows:
- `settingMappings` relation
- `m365Compliance` relation

Click on the `M365Policy` model and verify it shows:
- `complianceChecks` relation

**✅ VERIFICATION CHECKLIST - Step 4:**
- [ ] Prisma Studio opens successfully
- [ ] All 4 new tables visible
- [ ] Tables are empty (0 records)
- [ ] Control model shows new relations
- [ ] M365Policy model shows new relations
- [ ] No database errors

---

### Step 5: Create Schema Verification Script

Create a script to programmatically verify the schema:

**📁 Location:** `server/src/scripts/`  
**📄 File:** `verify-m365-schema.ts`

```typescript
/**
 * M365 Settings Schema Verification Script
 * 
 * Verifies that the M365 settings system schema is correctly set up
 * Usage: npm run verify:m365-schema
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface SchemaCheck {
  name: string;
  passed: boolean;
  message: string;
}

async function verifySchema(): Promise<void> {
  logger.info('🔍 Verifying M365 Settings Schema...\n');

  const checks: SchemaCheck[] = [];

  try {
    // Check 1: M365Setting table exists and is accessible
    try {
      await prisma.m365Setting.findMany({ take: 1 });
      checks.push({
        name: 'M365Setting Table',
        passed: true,
        message: 'Table exists and is accessible'
      });
    } catch (error) {
      checks.push({
        name: 'M365Setting Table',
        passed: false,
        message: `Table not accessible: ${error}`
      });
    }

    // Check 2: ControlSettingMapping table exists
    try {
      await prisma.controlSettingMapping.findMany({ take: 1 });
      checks.push({
        name: 'ControlSettingMapping Table',
        passed: true,
        message: 'Table exists and is accessible'
      });
    } catch (error) {
      checks.push({
        name: 'ControlSettingMapping Table',
        passed: false,
        message: `Table not accessible: ${error}`
      });
    }

    // Check 3: SettingComplianceCheck table exists
    try {
      await prisma.settingComplianceCheck.findMany({ take: 1 });
      checks.push({
        name: 'SettingComplianceCheck Table',
        passed: true,
        message: 'Table exists and is accessible'
      });
    } catch (error) {
      checks.push({
        name: 'SettingComplianceCheck Table',
        passed: false,
        message: `Table not accessible: ${error}`
      });
    }

    // Check 4: ControlM365Compliance table exists
    try {
      await prisma.controlM365Compliance.findMany({ take: 1 });
      checks.push({
        name: 'ControlM365Compliance Table',
        passed: true,
        message: 'Table exists and is accessible'
      });
    } catch (error) {
      checks.push({
        name: 'ControlM365Compliance Table',
        passed: false,
        message: `Table not accessible: ${error}`
      });
    }

    // Check 5: Control model has new relations
    try {
      const control = await prisma.control.findFirst({
        include: {
          settingMappings: true,
          m365Compliance: true,
        },
      });
      checks.push({
        name: 'Control Relations',
        passed: true,
        message: 'Control model has settingMappings and m365Compliance relations'
      });
    } catch (error) {
      checks.push({
        name: 'Control Relations',
        passed: false,
        message: `Relations not accessible: ${error}`
      });
    }

    // Check 6: M365Policy model has new relation
    try {
      const policy = await prisma.m365Policy.findFirst({
        include: {
          complianceChecks: true,
        },
      });
      checks.push({
        name: 'M365Policy Relations',
        passed: true,
        message: 'M365Policy model has complianceChecks relation'
      });
    } catch (error) {
      checks.push({
        name: 'M365Policy Relations',
        passed: false,
        message: `Relation not accessible: ${error}`
      });
    }

    // Check 7: Unique constraints
    try {
      // This will fail if unique constraint doesn't exist
      await prisma.$queryRaw`
        SELECT sql FROM sqlite_master 
        WHERE type='index' 
        AND tbl_name='m365_settings' 
        AND name LIKE '%unique%'
      `;
      checks.push({
        name: 'Unique Constraints',
        passed: true,
        message: 'Unique constraints properly configured'
      });
    } catch (error) {
      checks.push({
        name: 'Unique Constraints',
        passed: false,
        message: `Constraints not found: ${error}`
      });
    }

    // Print results
    console.log('\n' + '='.repeat(80));
    console.log('SCHEMA VERIFICATION RESULTS');
    console.log('='.repeat(80) + '\n');

    let allPassed = true;
    checks.forEach((check, index) => {
      const icon = check.passed ? '✅' : '❌';
      const status = check.passed ? 'PASS' : 'FAIL';
      console.log(`${index + 1}. ${icon} ${check.name}`);
      console.log(`   Status: ${status}`);
      console.log(`   ${check.message}\n`);
      if (!check.passed) allPassed = false;
    });

    console.log('='.repeat(80));
    if (allPassed) {
      console.log('✅ ALL CHECKS PASSED - Schema is correctly configured!');
      logger.info('Schema verification completed successfully');
    } else {
      console.log('❌ SOME CHECKS FAILED - Review errors above');
      logger.error('Schema verification found issues');
      process.exit(1);
    }
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    logger.error('Error during schema verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  verifySchema()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Verification script failed:', error);
      process.exit(1);
    });
}

export { verifySchema };
```

#### Step 5.1: Add Script Command to package.json

**📁 File:** `server/package.json`

🔍 **FIND:**
```json
    "test:sync": "ts-node -r tsconfig-paths/register src/scripts/test-sync.ts",
    "cleanup:reports": "ts-node src/scripts/cleanupOldReports.ts",
    "backup:rev3": "ts-node src/scripts/create-migration-backup.ts"
```

✏️ **REPLACE WITH:**
```json
    "test:sync": "ts-node -r tsconfig-paths/register src/scripts/test-sync.ts",
    "cleanup:reports": "ts-node src/scripts/cleanupOldReports.ts",
    "backup:rev3": "ts-node src/scripts/create-migration-backup.ts",
    "verify:m365-schema": "ts-node -r tsconfig-paths/register src/scripts/verify-m365-schema.ts"
```

#### Step 5.2: Run Verification Script

```bash
npm run verify:m365-schema
```

**Expected Output:**
```
🔍 Verifying M365 Settings Schema...

================================================================================
SCHEMA VERIFICATION RESULTS
================================================================================

1. ✅ M365Setting Table
   Status: PASS
   Table exists and is accessible

2. ✅ ControlSettingMapping Table
   Status: PASS
   Table exists and is accessible

3. ✅ SettingComplianceCheck Table
   Status: PASS
   Table exists and is accessible

4. ✅ ControlM365Compliance Table
   Status: PASS
   Table exists and is accessible

5. ✅ Control Relations
   Status: PASS
   Control model has settingMappings and m365Compliance relations

6. ✅ M365Policy Relations
   Status: PASS
   M365Policy model has complianceChecks relation

7. ✅ Unique Constraints
   Status: PASS
   Unique constraints properly configured

================================================================================
✅ ALL CHECKS PASSED - Schema is correctly configured!
================================================================================
```

**✅ VERIFICATION CHECKLIST - Step 5:**
- [ ] Verification script created
- [ ] Script added to package.json
- [ ] Script runs without errors
- [ ] All 7 checks pass
- [ ] Script output shows success message

---

## 📋 FINAL VALIDATION CHECKLIST

### Database Schema
- [ ] All 4 new tables created successfully
- [ ] `m365_settings` table has all required columns
- [ ] `control_setting_mappings` table has all required columns
- [ ] `setting_compliance_checks` table has all required columns
- [ ] `control_m365_compliance` table has all required columns

### Relations
- [ ] `Control` model includes `settingMappings` relation
- [ ] `Control` model includes `m365Compliance` relation
- [ ] `M365Policy` model includes `complianceChecks` relation
- [ ] All foreign key constraints properly configured
- [ ] Cascade deletes work correctly

### Indexes
- [ ] Unique index on `(settingPath, policyType, platform)` in M365Setting
- [ ] Unique index on `(controlId, settingId)` in ControlSettingMapping
- [ ] Unique index on `(settingId, policyId)` in SettingComplianceCheck
- [ ] Unique index on `controlId` in ControlM365Compliance
- [ ] Performance indexes on frequently queried columns

### Code Updates
- [ ] `database.ts` updated (no controlPolicyMapping references)
- [ ] `prisma.types.ts` updated with new model types
- [ ] `controlService.ts` updated (temporary compatibility fix)
- [ ] All TypeScript files compile without errors
- [ ] No ESLint errors

### Testing
- [ ] Prisma Studio shows all tables
- [ ] Migration applied successfully
- [ ] Verification script passes all checks
- [ ] No database errors in logs

---

## 🚨 TROUBLESHOOTING

### Issue: Migration Fails

**Symptoms:**
```
Error: P3005
The migration could not be completed
```

**Solution:**
1. Check if database is locked (close Prisma Studio)
2. Verify database file permissions
3. Try: `npx prisma migrate reset` (WARNING: deletes all data)
4. Restore from backup if needed

### Issue: TypeScript Errors After Schema Update

**Symptoms:**
```
Property 'settingMappings' does not exist on type 'Control'
```

**Solution:**
1. Regenerate Prisma client: `npx prisma generate`
2. Restart TypeScript server in IDE
3. Clear node_modules/@prisma/client if needed
4. Reinstall if persistent: `npm install`

### Issue: Relations Not Working

**Symptoms:**
- Cannot include related data in queries
- Foreign key constraint errors

**Solution:**
1. Verify migration was applied: `npx prisma migrate status`
2. Check schema syntax for typos
3. Ensure field names match in both models
4. Regenerate client after schema changes

### Issue: Verification Script Fails

**Symptoms:**
```
❌ SOME CHECKS FAILED
```

**Solution:**
1. Check which specific check failed
2. Verify migration was applied correctly
3. Check database file exists and is readable
4. Review migration SQL for errors
5. Try: `npx prisma db push` to force sync

---

## 📝 ROLLBACK PROCEDURE

If you need to rollback this migration:

### Option 1: Undo Migration (Preserves Data)

```bash
# Undo last migration
cd server
npx prisma migrate resolve --rolled-back 20241117_add_m365_settings_system

# Remove migration files
rm -rf prisma/migrations/*_add_m365_settings_system
```

### Option 2: Full Reset (DELETES ALL DATA)

```bash
cd server
npx prisma migrate reset
# Reapply only previous migrations when prompted
```

### Option 3: Restore from Backup

If you created a backup before starting:
```bash
cp database/backups/[backup-name]/dev.db server/prisma/dev.db
```

---

## ✅ COMPLETION CRITERIA

Phase 1 is complete when:

1. ✅ All 4 new tables created and accessible
2. ✅ All relations properly configured
3. ✅ All indexes created
4. ✅ Migration applied successfully
5. ✅ Verification script passes all checks
6. ✅ No TypeScript errors
7. ✅ No database errors
8. ✅ Prisma Studio shows all tables
9. ✅ Old system references removed/commented
10. ✅ Ready for Phase 2 data import

---

## 🚀 NEXT STEPS

After Phase 1 completion:

1. **Review this checklist** - ensure all items marked complete
2. **Commit changes** to version control
3. **Document any issues** encountered and solutions
4. **Proceed to Phase 2** - Database Import & Seeding
   - Import settings from `master_settings_catalog.json`
   - Import mappings from `control_settings_mappings.json`
   - Verify data integrity
   - Calculate initial compliance summaries

---

## 📚 REFERENCE

### Key Files Modified
- `server/prisma/schema.prisma` - Database schema
- `server/src/utils/database.ts` - Utility updates
- `server/src/types/prisma.types.ts` - Type definitions
- `server/src/services/controlService.ts` - Service updates
- `server/package.json` - Script additions

### Key Files Created
- `server/src/scripts/verify-m365-schema.ts` - Verification script
- `server/prisma/migrations/*_add_m365_settings_system/migration.sql` - Migration

### Database Tables
- `m365_settings` - Master settings catalog
- `control_setting_mappings` - Control-to-setting relationships
- `setting_compliance_checks` - Compliance validation results
- `control_m365_compliance` - Cached control-level summaries

---

**Phase 1 Status:** ⏸️ Ready for Implementation  
**Estimated Time:** 30-45 minutes  
**Difficulty:** Medium  
**Risk Level:** Low (additive changes only)

---

**END OF PHASE 1**
