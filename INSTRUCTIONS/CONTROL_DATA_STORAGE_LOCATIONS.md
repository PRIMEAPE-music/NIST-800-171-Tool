# NIST Control Data Storage & Reference Locations

**Last Updated:** 2025-11-16
**Purpose:** Complete documentation of where NIST 800-171 controls are stored, referenced, and utilized throughout the application

---

## Table of Contents

1. [Storage Locations](#storage-locations)
2. [Backend Code References](#backend-code-references)
3. [Frontend Code References](#frontend-code-references)
4. [Database Models](#database-models)
5. [API Endpoints](#api-endpoints)
6. [Data Flow](#data-flow)
7. [Migration & Seeding](#migration--seeding)

---

## Storage Locations

### Database (Primary Storage)

**Schema Definition:**
- **File:** `server/prisma/schema.prisma`
- **Model:** `Control` (lines 17-46)
- **Database Type:** SQLite
- **Location:** `server/database/nist-compliance.db`

**Control Model Fields:**
```prisma
model Control {
  id              Int      @id @default(autoincrement())
  controlId       String   @unique  // Format: "03.01.01" for Rev 3
  family          String   // AC|AT|AU|CA|CM|CP|IA|IR|MA|MP|PE|PS|RA|SA|SC|SI|SR|PL
  title           String
  requirementText String
  discussionText  String?
  priority        String   @default("Medium") // Critical, High, Medium, Low
  revision        String   @default("3")
  publicationDate String   @default("May 2024")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### JSON Data Files

**Primary Control Library:**
- **File:** `data/nist-800-171-controls.json` (853 lines)
- **Purpose:** Source of truth for NIST 800-171 Rev 3 controls
- **Structure:**
  ```json
  {
    "version": "NIST SP 800-171 Revision 3",
    "publicationDate": "May 2024",
    "totalControls": 110,
    "families": { ... },
    "controls": [ ... ]
  }
  ```

**Control Families Reference:**
- **File:** `data/control-families-reference.json`
- **Purpose:** Metadata about each control family (AC, AT, AU, etc.)
- **Contains:** Family codes, names, descriptions, control counts, control IDs

**Improvement Actions:**
- **File:** `data/nist-improvement-actions.json` (1,857 lines)
- **Purpose:** Maps NIST controls to improvement actions
- **Note:** Microsoft-specific improvement actions are being phased out

**M365 Integration Data:**
- **File:** `data/control-m365-mappings.json` (1,697 lines)
- **Purpose:** Maps controls to Microsoft 365 policies
- **File:** `data/control-settings-mappings.json` (801 lines)
- **Purpose:** Maps controls to specific M365 policy settings

**Deprecated/To Be Removed:**
- **File:** `data/microsoft-improvement-actions.json` (670 lines)
- **Status:** Will be removed in future updates

---

## Backend Code References

### Core Control Services

#### Control Service
- **File:** `server/src/services/controlService.ts`
- **Purpose:** Main business logic for control operations
- **Key Methods:**
  - `getAllControls()` - Fetch controls with filtering/pagination
  - `getControlById()` - Get by database ID
  - `getControlByControlId()` - Get by control ID (e.g., "03.01.01")
  - `updateControl()` - Update control data
  - `getControlsByFamily()` - Filter by family

#### Control Controller
- **File:** `server/src/controllers/controlController.ts`
- **Purpose:** HTTP request/response handlers
- **Endpoints Handled:**
  - `GET /api/controls` - List all controls
  - `GET /api/controls/:id` - Get by ID
  - `GET /api/controls/control/:controlId` - Get by control ID
  - `PUT /api/controls/:id` - Update control
  - `GET /api/controls/family/:family` - Get by family

#### Control Routes
- **File:** `server/src/routes/controlRoutes.ts`
- **Purpose:** Route definitions for control API endpoints

### Improvement Action Services

**Note:** These services integrate improvement actions with controls

#### Improvement Action Mapping Service
- **File:** `server/src/services/improvementActionMapping.service.ts`
- **Purpose:** Maps improvement actions to policies/settings
- **Data Source:** Loads from `data/nist-improvement-actions.json` (line 63-68)
- **Key Features:**
  - Platform-specific tracking (Windows, iOS, Android, macOS)
  - Policy compliance calculation
  - Control progress mapping

#### Control Progress Service
- **File:** `server/src/services/controlProgress.service.ts`
- **Purpose:** Calculates control implementation progress
- **Dependencies:** Uses improvement action mappings
- **Method:** `calculateAllControlsProgress()`

#### Policy-Based Progress Service
- **File:** `server/src/services/policyBasedProgress.service.ts`
- **Purpose:** Tracks progress based on M365 policy compliance

#### Settings Mapper Service
- **File:** `server/src/services/settingsMapper.service.ts`
- **Purpose:** Maps M365 settings to NIST controls
- **Data Source:** `data/control-settings-mappings.json`

### M365 Integration Services

**Note:** These services integrate Microsoft 365 data with controls

- **File:** `server/src/services/secureScore.service.ts`
  - Purpose: Microsoft Secure Score integration

- **File:** `server/src/services/complianceManager.service.ts`
  - Purpose: Microsoft Compliance Manager integration

- **File:** `server/src/services/intune.service.ts`
  - Purpose: Microsoft Intune policy management

- **File:** `server/src/services/purview.service.ts`
  - Purpose: Microsoft Purview compliance data

- **File:** `server/src/services/azureAD.service.ts`
  - Purpose: Azure AD policy management

### Statistics & Reporting Services

- **File:** `server/src/services/statisticsService.ts`
  - Purpose: Control statistics and metrics

- **File:** `server/src/services/reports/reportService.ts`
  - Purpose: Report generation for controls

- **File:** `server/src/controllers/statsController.ts`
  - Purpose: Statistics API endpoints

### Gap Analysis & POAM Services

- **File:** `server/src/services/gapAnalysis.service.ts`
  - Purpose: Gap analysis for controls

- **File:** `server/src/services/poam.service.ts`
  - Purpose: Plan of Action & Milestones management

- **File:** `server/src/controllers/poam.controller.ts`
  - Purpose: POAM API endpoints

- **File:** `server/src/routes/poam.routes.ts`
  - Purpose: POAM route definitions

### Validation & Types

- **File:** `server/src/validation/controlSchemas.ts`
  - Purpose: Zod validation schemas for controls

- **File:** `server/src/types/controls.ts`
  - Purpose: TypeScript type definitions

- **File:** `server/src/types/enums.ts`
  - Purpose: Enums for control families, priorities, statuses

- **File:** `server/src/constants/controls.ts`
  - Purpose: Control-related constants

---

## Frontend Code References

### Type Definitions

#### Control Types
- **File:** `client/src/types/controls.ts`
- **Defines:**
  - `Control` interface
  - `ControlWithStatus` interface
  - `ControlFamily` type
  - `ControlPriority` type
  - `ControlStatus` type
  - `ControlFilters` interface
  - API response types

#### Control Constants
- **File:** `client/src/constants/controls.ts`
- **Contains:**
  - `NIST_REVISION = '3'`
  - `TOTAL_CONTROLS = 110`
  - `CONTROL_FAMILIES` object with metadata
  - `PRIORITY_LEVELS` object
  - `CONTROL_STATUSES` object

### Core Control Components

#### Control Display Components
- **File:** `client/src/components/controls/ControlTable.tsx`
  - Purpose: Main table display for controls

- **File:** `client/src/components/controls/ControlHeader.tsx`
  - Purpose: Control detail page header

- **File:** `client/src/components/controls/ControlFilters.tsx`
  - Purpose: Filter controls by family, status, priority

- **File:** `client/src/components/controls/StatusBadge.tsx`
  - Purpose: Visual status indicator

- **File:** `client/src/components/controls/StatusUpdateDialog.tsx`
  - Purpose: Update control implementation status

- **File:** `client/src/components/controls/BulkActionsDialog.tsx`
  - Purpose: Bulk operations on multiple controls

#### Control Detail Tabs
- **File:** `client/src/components/controls/EvidenceTab.tsx`
  - Purpose: Display evidence for control

- **File:** `client/src/components/controls/RelatedTab.tsx`
  - Purpose: Show related controls and dependencies

- **File:** `client/src/components/controls/HistoryTab.tsx`
  - Purpose: Control change history/audit trail

- **File:** `client/src/components/controls/M365SettingsTab.tsx`
  - Purpose: M365 policy settings mapped to control
  - Note: Depends on improvement actions

- **File:** `client/src/components/controls/M365CoverageStatus.tsx`
  - Purpose: M365 coverage visualization
  - Note: Depends on improvement actions

### Dashboard Components

- **File:** `client/src/components/dashboard/OverallComplianceCard.tsx`
  - Purpose: Overall compliance percentage display

- **File:** `client/src/components/dashboard/ControlsByStatusCard.tsx`
  - Purpose: Breakdown of controls by status

- **File:** `client/src/components/dashboard/PriorityDistributionCard.tsx`
  - Purpose: Distribution of controls by priority

- **File:** `client/src/components/dashboard/FamilyComplianceChart.tsx`
  - Purpose: Compliance by control family chart

- **File:** `client/src/components/dashboard/TopGapsCard.tsx`
  - Purpose: Display top compliance gaps

- **File:** `client/src/components/dashboard/ImprovementActionsCard.tsx`
  - Purpose: Show improvement action progress
  - Note: Will be affected by improvement action removal

- **File:** `client/src/components/dashboard/RecentActivityFeed.tsx`
  - Purpose: Recent control updates

### Pages

- **File:** `client/src/pages/ControlLibrary.tsx`
  - Purpose: Main control library page
  - Features: Browse, search, filter all controls

- **File:** `client/src/pages/M365Dashboard.tsx`
  - Purpose: M365 integration dashboard
  - Note: Depends on improvement actions

- **File:** `client/src/pages/M365GapAnalysis.tsx`
  - Purpose: Gap analysis based on M365 policies
  - Note: Depends on improvement actions

- **File:** `client/src/pages/M365Integration.tsx`
  - Purpose: M365 integration configuration

- **File:** `client/src/pages/PolicyViewer.tsx`
  - Purpose: View M365 policies

- **File:** `client/src/pages/SuggestedMappings.tsx`
  - Purpose: AI-suggested policy mappings

### Hooks & Services

#### Custom Hooks
- **File:** `client/src/hooks/useControls.ts`
  - Purpose: React hook for control data fetching
  - Features: Caching, error handling, loading states

#### API Services
- **File:** `client/src/services/api.ts`
  - Purpose: Base API client configuration

- **File:** `client/src/services/controlService.ts`
  - Purpose: Control-specific API calls
  - Methods: `getControls()`, `getControlById()`, `updateControl()`

- **File:** `client/src/services/m365.service.ts`
  - Purpose: M365 integration API calls

---

## Database Models

### Models with Control Foreign Key Relationships

All of these models reference the `Control` table via foreign keys:

1. **ControlStatus** (`server/prisma/schema.prisma` lines 52-68)
   - Purpose: Implementation status tracking
   - Relation: One-to-one with Control
   - Fields: status, implementationDate, assignedTo, notes

2. **Assessment** (`server/prisma/schema.prisma` lines 74-90)
   - Purpose: Compliance assessment records
   - Relation: Many-to-one with Control
   - Fields: assessmentDate, isImplemented, hasEvidence, riskScore

3. **Evidence** (`server/prisma/schema.prisma` lines 96-121)
   - Purpose: Evidence file tracking
   - Relation: Many-to-one with Control
   - Fields: fileName, filePath, fileType, uploadedDate

4. **Poam** (`server/prisma/schema.prisma` lines 127-151)
   - Purpose: Plan of Action & Milestones
   - Relation: Many-to-one with Control
   - Fields: gapDescription, remediationPlan, status, priority

5. **ControlPolicyMapping** (`server/prisma/schema.prisma` lines 201-219)
   - Purpose: Maps controls to M365 policies
   - Relation: Many-to-one with Control
   - Fields: policyId, mappingConfidence, mappedSettings
   - Note: Will be affected by improvement action changes

6. **ChangeHistory** (`server/prisma/schema.prisma` lines 260-273)
   - Purpose: Audit trail for control changes
   - Relation: Many-to-one with Control
   - Fields: fieldChanged, oldValue, newValue, changedBy

7. **ControlGap** (`server/prisma/schema.prisma` lines 331-364)
   - Purpose: Gap analysis results
   - Relation: Many-to-one with Control
   - Fields: gapType, gapDescription, severity, status

8. **POAMItem** (`server/prisma/schema.prisma` lines 367-406)
   - Purpose: Enhanced POAM tracking
   - Relation: Many-to-one with Control
   - Fields: weakness, riskLevel, remediationPlan

9. **ControlCoverage** (`server/prisma/schema.prisma` lines 409-438)
   - Purpose: Coverage metrics per control
   - Relation: One-to-one with Control
   - Fields: technicalCoverage, policyCoverage, overallCoverage

10. **ControlEvidence** (`server/prisma/schema.prisma` lines 441-472)
    - Purpose: Evidence collection tracking
    - Relation: Many-to-one with Control
    - Fields: evidenceType, evidenceTitle, status

---

## API Endpoints

### Control Endpoints

Base URL: `/api/controls`

| Method | Endpoint | Controller Method | Purpose |
|--------|----------|------------------|---------|
| GET | `/api/controls` | `getAllControls()` | List all controls with filtering |
| GET | `/api/controls/:id` | `getControlById()` | Get control by database ID |
| GET | `/api/controls/control/:controlId` | `getControlByControlId()` | Get by control ID (e.g., "03.01.01") |
| PUT | `/api/controls/:id` | `updateControl()` | Update control data |
| GET | `/api/controls/family/:family` | `getControlsByFamily()` | Get controls by family |
| GET | `/api/controls/stats` | `getControlStats()` | Get control statistics |

### Query Parameters (for GET /api/controls)

- `family` - Filter by family code (AC, AT, etc.)
- `status` - Filter by implementation status
- `priority` - Filter by priority level
- `search` - Search in controlId, title, requirementText
- `page` - Page number for pagination
- `limit` - Items per page
- `sortBy` - Field to sort by
- `sortOrder` - 'asc' or 'desc'

### Related Endpoints

- **POAM Endpoints:** `/api/poams`
- **Evidence Endpoints:** `/api/evidence`
- **Assessment Endpoints:** `/api/assessments`
- **M365 Endpoints:** `/api/m365`
- **Statistics Endpoints:** `/api/stats`
- **Reports Endpoints:** `/api/reports`

---

## Data Flow

### Control Loading Flow

```
1. Source Data (JSON)
   └─> data/nist-800-171-controls.json

2. Database Seeding
   └─> server/prisma/seed.ts
       └─> Reads JSON file
       └─> Creates Control records in database
       └─> Creates default ControlStatus records

3. API Layer
   └─> server/src/services/controlService.ts
       └─> Queries database via Prisma
       └─> Enriches with progress data
       └─> Returns to controller

4. Controller Layer
   └─> server/src/controllers/controlController.ts
       └─> Handles HTTP requests
       └─> Calls service methods
       └─> Returns JSON responses

5. Client Layer
   └─> client/src/services/controlService.ts
       └─> Fetches from API
       └─> client/src/hooks/useControls.ts
           └─> Caches in React Query
           └─> client/src/components/controls/*
               └─> Displays in UI
```

### Improvement Action Integration Flow

```
1. Improvement Actions Data
   └─> data/nist-improvement-actions.json

2. Mapping Service
   └─> server/src/services/improvementActionMapping.service.ts
       └─> Loads improvement actions
       └─> Maps to M365 policies from database
       └─> Calculates compliance per action

3. Progress Calculation
   └─> server/src/services/controlProgress.service.ts
       └─> Gets improvement actions per control
       └─> Calculates overall progress percentage
       └─> Returns progress data

4. Control Service Integration
   └─> server/src/services/controlService.ts
       └─> Enriches control data with progress
       └─> Returns combined data to client

5. UI Display
   └─> client/src/components/controls/M365CoverageStatus.tsx
       └─> Shows progress visualization
```

---

## Migration & Seeding

### Database Migrations

**Location:** `server/prisma/migrations/`

**Key Migrations:**
- `20251106201102_init` - Initial database schema
- `20251106212146_update_to_nist_rev3` - NIST Rev 3 updates
- `20251107220634_add_m365_integration` - M365 integration tables
- `20251113171336_add_gap_analysis_tables` - Gap analysis enhancement

### Seed Script

**File:** `server/prisma/seed.ts`

**Process:**
1. Reads `data/nist-800-171-controls.json`
2. Clears existing control data (optional)
3. Creates Control records
4. Creates default ControlStatus records
5. Seeds sample POAMs
6. Seeds default settings

**Run Command:**
```bash
npm run seed
# or
npx prisma db seed
```

### Data Update Scripts

**Location:** `server/src/scripts/`

**Control Update Scripts:**
- `update-phase1-controls.ts` - Phase 1 control updates
- `update-phase2-controls.ts` - Phase 2 control updates
- `update-phase3-controls.ts` - Phase 3 control updates
- `update-phase4-controls.ts` - Phase 4 control updates
- `update-phase5-controls.ts` - Phase 5 control updates
- `verify-phase*.ts` - Verification scripts for each phase

**Utility Scripts:**
- `find-missing-controls.ts` - Find missing controls
- `check-controls.ts` - Validate control data
- `check-withdrawn-controls.ts` - Check for withdrawn controls
- `delete-withdrawn-controls.ts` - Remove withdrawn controls
- `fix-control-titles.ts` - Fix control title formatting

---

## Files to Update for Control Changes

### When Replacing All Controls:

#### Must Update:
1. `data/nist-800-171-controls.json` - Primary control data
2. `server/prisma/seed.ts` - Seeding logic (if structure changes)
3. Database (run seed/migration)

#### Should Review:
4. `data/control-families-reference.json` - Family metadata
5. `client/src/constants/controls.ts` - Frontend constants
6. `server/src/constants/controls.ts` - Backend constants

#### May Need Updates:
7. `data/nist-improvement-actions.json` - Control-to-action mappings
8. `data/control-m365-mappings.json` - Control-to-policy mappings
9. `data/control-settings-mappings.json` - Control-to-settings mappings

#### For Microsoft Improvement Action Removal:
10. `data/microsoft-improvement-actions.json` - DELETE
11. Services that reference it:
    - `server/src/services/improvementActionMapping.service.ts`
    - `server/src/services/controlProgress.service.ts`
    - `server/src/services/policyBasedProgress.service.ts`
12. Components that display it:
    - `client/src/components/dashboard/ImprovementActionsCard.tsx`
    - `client/src/components/controls/M365SettingsTab.tsx`
    - `client/src/components/controls/M365CoverageStatus.tsx`

---

## Notes

- **Total Controls:** 110 (NIST 800-171 Rev 3)
- **Control ID Format:** `03.XX.YY` (e.g., `03.01.01`)
- **Families:** 18 families (AC, AT, AU, CA, CM, CP, IA, IR, MA, MP, PE, PS, RA, SA, SC, SI, SR, PL)
- **Database:** SQLite with Prisma ORM
- **Frontend:** React + TypeScript + Material-UI
- **Backend:** Express + TypeScript + Prisma

---

**For Questions or Updates:**
Refer to the main application documentation or contact the development team.
