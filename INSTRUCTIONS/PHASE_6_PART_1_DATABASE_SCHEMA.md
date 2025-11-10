# Phase 6 Part 1: Database Schema & TypeScript Types

## 🎯 Objective
Update the Prisma schema to support Microsoft 365 integration data storage and generate corresponding TypeScript types.

## 📋 Prerequisites
- Existing Prisma schema with controls, control_status, assessments tables
- Prisma CLI installed (`npx prisma` works)
- SQLite database at `../database/compliance.db`

## 🗂️ Files to Modify/Create

### 1. Update Prisma Schema
**📁 File**: `server/prisma/schema.prisma`

Add these new models to the existing schema:

```prisma
// Microsoft 365 Policies
model M365Policy {
  id                Int       @id @default(autoincrement())
  policyType        String    // 'Intune' | 'Purview' | 'AzureAD'
  policyId          String    @unique // External ID from M365
  policyName        String
  policyDescription String?
  policyData        String    // JSON string of full policy object
  lastSynced        DateTime  @default(now())
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  controlMappings   ControlPolicyMapping[]

  @@map("m365_policies")
}

// Mapping table between Controls and M365 Policies
model ControlPolicyMapping {
  id                Int       @id @default(autoincrement())
  controlId         Int
  policyId          Int
  mappingConfidence String    // 'High' | 'Medium' | 'Low'
  mappingNotes      String?
  createdAt         DateTime  @default(now())
  
  // Relations
  control           Control   @relation(fields: [controlId], references: [id], onDelete: Cascade)
  policy            M365Policy @relation(fields: [policyId], references: [id], onDelete: Cascade)

  @@unique([controlId, policyId])
  @@map("control_policy_mappings")
}

// M365 Integration Settings
model M365Settings {
  id                Int       @id @default(autoincrement())
  tenantId          String?
  clientId          String?
  lastSyncDate      DateTime?
  syncEnabled       Boolean   @default(false)
  autoSyncInterval  Int       @default(24) // hours
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@map("m365_settings")
}

// Sync History Log
model M365SyncLog {
  id                Int       @id @default(autoincrement())
  syncDate          DateTime  @default(now())
  syncType          String    // 'Manual' | 'Automatic'
  policiesUpdated   Int       @default(0)
  controlsUpdated   Int       @default(0)
  status            String    // 'Success' | 'Failed' | 'Partial'
  errorMessage      String?
  syncDuration      Int?      // milliseconds
  createdAt         DateTime  @default(now())

  @@map("m365_sync_logs")
}
```

### 2. Update Control Model
Add relation to the existing Control model:

**📁 File**: `server/prisma/schema.prisma`

Find the `Control` model and add this relation:

```prisma
model Control {
  // ... existing fields ...
  
  // Add this relation field
  policyMappings    ControlPolicyMapping[]
  
  // ... rest of existing relations ...
}
```

### 3. Create TypeScript Type Definitions

**📁 File**: `server/src/types/m365.types.ts`

🔄 **COMPLETE FILE**:

```typescript
// Microsoft 365 Integration Types

export type PolicyType = 'Intune' | 'Purview' | 'AzureAD';
export type MappingConfidence = 'High' | 'Medium' | 'Low';
export type SyncStatus = 'Success' | 'Failed' | 'Partial';
export type SyncType = 'Manual' | 'Automatic';

// M365 Policy Interface
export interface M365Policy {
  id: number;
  policyType: PolicyType;
  policyId: string;
  policyName: string;
  policyDescription?: string;
  policyData: string; // JSON string
  lastSynced: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Control to Policy Mapping
export interface ControlPolicyMapping {
  id: number;
  controlId: number;
  policyId: number;
  mappingConfidence: MappingConfidence;
  mappingNotes?: string;
  createdAt: Date;
}

// M365 Settings
export interface M365Settings {
  id: number;
  tenantId?: string;
  clientId?: string;
  lastSyncDate?: Date;
  syncEnabled: boolean;
  autoSyncInterval: number;
  createdAt: Date;
  updatedAt: Date;
}

// Sync Log Entry
export interface M365SyncLog {
  id: number;
  syncDate: Date;
  syncType: SyncType;
  policiesUpdated: number;
  controlsUpdated: number;
  status: SyncStatus;
  errorMessage?: string;
  syncDuration?: number;
  createdAt: Date;
}

// API Response Types
export interface SyncResult {
  success: boolean;
  policiesUpdated: number;
  controlsUpdated: number;
  duration: number;
  errors?: string[];
}

// Intune Policy Data Structures
export interface IntuneDeviceCompliancePolicy {
  '@odata.type': string;
  id: string;
  displayName: string;
  description?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  passwordRequired?: boolean;
  passwordMinimumLength?: number;
  requireHealthyDeviceReport?: boolean;
  osMinimumVersion?: string;
  osMaximumVersion?: string;
}

export interface IntuneConfigurationPolicy {
  '@odata.type': string;
  id: string;
  displayName: string;
  description?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  platformType?: string;
}

// Purview Policy Data Structures
export interface PurviewDLPPolicy {
  Identity: string;
  Name: string;
  Comment?: string;
  Enabled: boolean;
  Mode: string;
  CreatedBy: string;
  LastModifiedBy: string;
  CreatedTime: string;
  LastModifiedTime: string;
}

export interface PurviewSensitivityLabel {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sensitivity: number;
  parentId?: string;
}

// Azure AD Policy Data Structures
export interface AzureADConditionalAccessPolicy {
  id: string;
  displayName: string;
  state: string; // enabled, disabled, enabledForReportingButNotEnforced
  createdDateTime: string;
  modifiedDateTime: string;
  conditions: {
    users?: any;
    applications?: any;
    locations?: any;
    signInRiskLevels?: string[];
  };
  grantControls?: {
    operator: string;
    builtInControls: string[];
  };
}

export interface AzureADMFAStatus {
  enabled: boolean;
  enforcementMethod: string; // 'ConditionalAccess' | 'PerUserMFA' | 'SecurityDefaults'
  totalUsers: number;
  usersWithMFA: number;
  percentageCompliance: number;
}

// Mapping Template Interface (for predefined mappings)
export interface ControlPolicyMappingTemplate {
  controlId: string; // e.g., "3.1.1"
  policyTypes: PolicyType[];
  searchCriteria: {
    nameContains?: string[];
    policyTypeSpecific?: any;
  };
  mappingConfidence: MappingConfidence;
  mappingReason: string;
}
```

### 4. Create Shared Types for Frontend

**📁 File**: `shared/types/m365.types.ts`

🔄 **COMPLETE FILE**:

```typescript
// Shared M365 types between client and server

export type PolicyType = 'Intune' | 'Purview' | 'AzureAD';
export type MappingConfidence = 'High' | 'Medium' | 'Low';
export type SyncStatus = 'Success' | 'Failed' | 'Partial';

// Frontend-safe M365 Policy (no sensitive data)
export interface M365PolicyDTO {
  id: number;
  policyType: PolicyType;
  policyName: string;
  policyDescription?: string;
  lastSynced: string; // ISO date string
  isActive: boolean;
  mappedControlsCount: number;
}

// Control Mapping DTO
export interface ControlPolicyMappingDTO {
  id: number;
  controlId: string; // "3.1.1" format
  controlTitle: string;
  policyId: number;
  policyName: string;
  policyType: PolicyType;
  mappingConfidence: MappingConfidence;
  mappingNotes?: string;
}

// Integration Status
export interface M365IntegrationStatus {
  connected: boolean;
  lastSyncDate?: string;
  tenantId?: string;
  policyCounts: {
    intune: number;
    purview: number;
    azureAD: number;
    total: number;
  };
  autoSyncEnabled: boolean;
  autoSyncInterval: number;
}

// Sync Request/Response
export interface SyncRequest {
  policyTypes?: PolicyType[]; // If empty, sync all
  forceRefresh?: boolean;
}

export interface SyncResponse {
  success: boolean;
  syncDate: string;
  policiesUpdated: number;
  controlsUpdated: number;
  duration: number;
  errors?: string[];
}

// M365 Dashboard Stats
export interface M365DashboardStats {
  totalPolicies: number;
  activePolicies: number;
  mappedControls: number;
  unmappedControls: number;
  lastSyncDate?: string;
  integrationHealth: 'Healthy' | 'Warning' | 'Error' | 'Not Connected';
  policyBreakdown: {
    intune: number;
    purview: number;
    azureAD: number;
  };
}
```

## 🔧 Implementation Steps

### Step 1: Update Prisma Schema
```bash
# Navigate to server directory
cd server

# Open schema.prisma and add the new models shown above
# Make sure to add the relation to the Control model

# Format the schema
npx prisma format
```

### Step 2: Create Migration
```bash
# Generate migration
npx prisma migrate dev --name add_m365_integration

# This will:
# - Create migration SQL files
# - Apply migration to database
# - Regenerate Prisma Client
```

### Step 3: Create TypeScript Type Files
```bash
# Create types directory if it doesn't exist
mkdir -p src/types

# Create the m365.types.ts file with content above
```

### Step 4: Create Shared Types Directory
```bash
# From project root
mkdir -p shared/types

# Create shared m365.types.ts file
```

### Step 5: Verify Migration
```bash
# Check database schema
npx prisma studio

# Verify tables were created:
# - m365_policies
# - control_policy_mappings  
# - m365_settings
# - m365_sync_logs
```

## 🧪 Testing

### Manual Database Verification
```bash
# Open SQLite database
sqlite3 ../database/compliance.db

# Check new tables exist
.tables

# Verify schema of new tables
.schema m365_policies
.schema control_policy_mappings
.schema m365_settings
.schema m365_sync_logs

# Exit
.quit
```

### TypeScript Compilation Check
```bash
# Compile TypeScript to verify no type errors
npm run build

# Should compile without errors
```

## ✅ Completion Checklist

- [ ] Prisma schema updated with 4 new models
- [ ] Control model updated with policyMappings relation
- [ ] Migration created and applied successfully
- [ ] Prisma Client regenerated
- [ ] server/src/types/m365.types.ts created
- [ ] shared/types/m365.types.ts created
- [ ] Database tables verified in Prisma Studio
- [ ] TypeScript compiles without errors
- [ ] Git commit created with changes

## 🚀 Next Steps

After completing Part 1, proceed to:
**Part 2: Backend Authentication Setup** (`PHASE_6_PART_2_BACKEND_AUTH.md`)

## 📝 Notes

### Why SQLite JSON Field as String?
SQLite doesn't have a native JSON type like PostgreSQL. We store policy data as a JSON string and parse it when needed. This maintains compatibility while allowing flexible policy data storage.

### Migration Best Practices
- Always review generated migration SQL before applying
- Keep migrations small and focused
- Test migrations on a copy of production data
- Document any manual data migrations needed

### Type Safety
The TypeScript types mirror the Prisma schema exactly. This ensures type safety across the full stack:
- Prisma Client → Server Types → API DTOs → Frontend Types

---

**Estimated Time**: 1-2 hours
**Complexity**: Low
**Dependencies**: None (foundation for all other parts)
