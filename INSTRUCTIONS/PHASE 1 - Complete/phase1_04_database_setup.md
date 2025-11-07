# Phase 1.4: Database Setup

## Objective
Configure Prisma ORM with SQLite, create comprehensive database schema for all 10 core tables, and set up migrations.

**Duration:** 4-5 hours  
**Prerequisites:** Phase 1.3 complete  
**Dependencies:** Node.js 18+, Prisma installed

---

## Tasks Overview

1. ✅ Initialize Prisma with SQLite
2. ✅ Create complete database schema (10 tables)
3. ✅ Configure Prisma Client
4. ✅ Create initial migration
5. ✅ Generate Prisma Client
6. ✅ Set up database connection module
7. ✅ Verify database creation

---

## Step-by-Step Instructions

### Step 1: Initialize Prisma

```bash
cd server
npx prisma init --datasource-provider sqlite
```

This creates:
- `prisma/schema.prisma` - Database schema file
- `.env` file (if it doesn't exist)

---

### Step 2: Configure Database URL

📁 **File:** `server/.env`

🔍 **FIND:**
```env
DATABASE_URL="file:./dev.db"
```

✏️ **REPLACE WITH:**
```env
DATABASE_URL="file:../database/compliance.db"
```

---

### Step 3: Create Complete Prisma Schema

📁 **File:** `server/prisma/schema.prisma`

🔄 **COMPLETE REWRITE:**
```prisma
// This is your Prisma schema file
// Learn more: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ============================================================================
// NIST 800-171 Controls
// ============================================================================

model Control {
  id               Int      @id @default(autoincrement())
  controlId        String   @unique @map("control_id") // e.g., "3.1.1"
  family           String   // e.g., "AC", "AU", "IA"
  title            String
  requirementText  String   @map("requirement_text")
  discussionText   String?  @map("discussion_text")
  priority         String   @default("Medium") // Critical, High, Medium, Low
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  // Relations
  status           ControlStatus?
  assessments      Assessment[]
  evidence         Evidence[]
  poams            Poam[]
  policyMappings   ControlPolicyMapping[]
  changeHistory    ChangeHistory[]

  @@map("controls")
}

// ============================================================================
// Control Implementation Status
// ============================================================================

model ControlStatus {
  id                  Int       @id @default(autoincrement())
  controlId           Int       @unique @map("control_id")
  status              String    @default("Not Started") // Not Started, In Progress, Implemented, Verified
  implementationDate  DateTime? @map("implementation_date")
  lastReviewedDate    DateTime? @map("last_reviewed_date")
  nextReviewDate      DateTime? @map("next_review_date")
  assignedTo          String?   @map("assigned_to")
  implementationNotes String?   @map("implementation_notes")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  // Relations
  control Control @relation(fields: [controlId], references: [id], onDelete: Cascade)

  @@map("control_status")
}

// ============================================================================
// Compliance Assessments
// ============================================================================

model Assessment {
  id              Int      @id @default(autoincrement())
  controlId       Int      @map("control_id")
  assessmentDate  DateTime @map("assessment_date")
  isImplemented   Boolean  @default(false) @map("is_implemented")
  hasEvidence     Boolean  @default(false) @map("has_evidence")
  isTested        Boolean  @default(false) @map("is_tested")
  meetsRequirement Boolean @default(false) @map("meets_requirement")
  riskScore       Int      @default(0) @map("risk_score") // 0-100
  assessorNotes   String?  @map("assessor_notes")
  createdAt       DateTime @default(now()) @map("created_at")

  // Relations
  control Control @relation(fields: [controlId], references: [id], onDelete: Cascade)

  @@map("assessments")
}

// ============================================================================
// Evidence Files
// ============================================================================

model Evidence {
  id          Int      @id @default(autoincrement())
  controlId   Int      @map("control_id")
  fileName    String   @map("file_name")
  filePath    String   @map("file_path")
  fileType    String   @map("file_type") // pdf, docx, png, etc.
  fileSize    Int      @map("file_size") // bytes
  description String?
  uploadDate  DateTime @default(now()) @map("upload_date")
  version     String   @default("1.0")
  createdAt   DateTime @default(now()) @map("created_at")

  // Relations
  control Control @relation(fields: [controlId], references: [id], onDelete: Cascade)

  @@map("evidence")
}

// ============================================================================
// POAMs (Plan of Action & Milestones)
// ============================================================================

model Poam {
  id               Int       @id @default(autoincrement())
  controlId        Int       @map("control_id")
  gapDescription   String    @map("gap_description")
  remediationPlan  String    @map("remediation_plan")
  assignedOwner    String    @map("assigned_owner")
  startDate        DateTime? @map("start_date")
  targetDate       DateTime? @map("target_date")
  completionDate   DateTime? @map("completion_date")
  status           String    @default("Open") // Open, In Progress, Completed, Risk Accepted
  priority         String    @default("Medium") // Critical, High, Medium, Low
  budgetEstimate   Float?    @map("budget_estimate")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  // Relations
  control    Control         @relation(fields: [controlId], references: [id], onDelete: Cascade)
  milestones PoamMilestone[]

  @@map("poams")
}

// ============================================================================
// POAM Milestones
// ============================================================================

model PoamMilestone {
  id                    Int       @id @default(autoincrement())
  poamId                Int       @map("poam_id")
  milestoneDescription  String    @map("milestone_description")
  dueDate               DateTime  @map("due_date")
  completionDate        DateTime? @map("completion_date")
  status                String    @default("Pending") // Pending, In Progress, Completed
  createdAt             DateTime  @default(now()) @map("created_at")

  // Relations
  poam Poam @relation(fields: [poamId], references: [id], onDelete: Cascade)

  @@map("poam_milestones")
}

// ============================================================================
// Microsoft 365 Policies
// ============================================================================

model M365Policy {
  id                Int      @id @default(autoincrement())
  policyType        String   @map("policy_type") // Intune, Purview, AzureAD
  policyId          String   @unique @map("policy_id") // From M365
  policyName        String   @map("policy_name")
  policyDescription String?  @map("policy_description")
  lastSynced        DateTime @map("last_synced")
  isActive          Boolean  @default(true) @map("is_active")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relations
  controlMappings ControlPolicyMapping[]

  @@map("m365_policies")
}

// ============================================================================
// Control to M365 Policy Mappings
// ============================================================================

model ControlPolicyMapping {
  id                 Int      @id @default(autoincrement())
  controlId          Int      @map("control_id")
  policyId           Int      @map("policy_id")
  mappingConfidence  String   @default("Medium") @map("mapping_confidence") // High, Medium, Low
  createdAt          DateTime @default(now()) @map("created_at")

  // Relations
  control Control     @relation(fields: [controlId], references: [id], onDelete: Cascade)
  policy  M365Policy  @relation(fields: [policyId], references: [id], onDelete: Cascade)

  @@unique([controlId, policyId])
  @@map("control_policy_mappings")
}

// ============================================================================
// Change History / Audit Log
// ============================================================================

model ChangeHistory {
  id           Int      @id @default(autoincrement())
  controlId    Int      @map("control_id")
  fieldChanged String   @map("field_changed")
  oldValue     String?  @map("old_value")
  newValue     String?  @map("new_value")
  changedBy    String   @map("changed_by")
  changedAt    DateTime @default(now()) @map("changed_at")

  // Relations
  control Control @relation(fields: [controlId], references: [id], onDelete: Cascade)

  @@map("change_history")
}

// ============================================================================
// Application Settings
// ============================================================================

model Setting {
  id           Int      @id @default(autoincrement())
  settingKey   String   @unique @map("setting_key")
  settingValue String   @map("setting_value")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("settings")
}
```

---

### Step 4: Create Database Connection Module

📁 **File:** `server/src/config/database.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

// Prisma Client singleton
let prisma: PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Create Prisma Client instance
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = global.__prisma;
}

// Handle Prisma Client connection
prisma.$connect()
  .then(() => {
    logger.info('✅ Database connected successfully');
  })
  .catch((error) => {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  });

// Graceful shutdown
const gracefulShutdown = async () => {
  await prisma.$disconnect();
  logger.info('Database connection closed');
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export { prisma };
```

---

### Step 5: Create Prisma Type Exports

📁 **File:** `server/src/types/prisma.types.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import { Prisma } from '@prisma/client';

// Export Prisma types for use in the application
export type Control = Prisma.ControlGetPayload<object>;
export type ControlStatus = Prisma.ControlStatusGetPayload<object>;
export type Assessment = Prisma.AssessmentGetPayload<object>;
export type Evidence = Prisma.EvidenceGetPayload<object>;
export type Poam = Prisma.PoamGetPayload<object>;
export type PoamMilestone = Prisma.PoamMilestoneGetPayload<object>;
export type M365Policy = Prisma.M365PolicyGetPayload<object>;
export type ControlPolicyMapping = Prisma.ControlPolicyMappingGetPayload<object>;
export type ChangeHistory = Prisma.ChangeHistoryGetPayload<object>;
export type Setting = Prisma.SettingGetPayload<object>;

// Control with relations
export type ControlWithRelations = Prisma.ControlGetPayload<{
  include: {
    status: true;
    assessments: true;
    evidence: true;
    poams: true;
    policyMappings: {
      include: {
        policy: true;
      };
    };
  };
}>;

// POAM with milestones
export type PoamWithMilestones = Prisma.PoamGetPayload<{
  include: {
    milestones: true;
    control: true;
  };
}>;

// Assessment response types
export type AssessmentWithControl = Prisma.AssessmentGetPayload<{
  include: {
    control: true;
  };
}>;
```

---

### Step 6: Generate Prisma Client

```bash
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client (5.x.x) to ./node_modules/@prisma/client
```

---

### Step 7: Create Initial Migration

```bash
npx prisma migrate dev --name init
```

**Expected Output:**
```
Applying migration `20251106XXXXXX_init`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20251106XXXXXX_init/
    └─ migration.sql

✔ Generated Prisma Client (5.x.x) to ./node_modules/@prisma/client
```

This will:
1. Create `database/compliance.db` file
2. Apply the schema to create all 10 tables
3. Create migration file in `prisma/migrations/`
4. Regenerate Prisma Client

---

### Step 8: Update Server to Use Database

📁 **File:** `server/src/app.ts`

🔍 **FIND:**
```typescript
import { config } from '@/config';
import { logger, loggerStream } from '@/utils/logger';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
```

✏️ **REPLACE WITH:**
```typescript
import { config } from '@/config';
import { logger, loggerStream } from '@/utils/logger';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { prisma } from '@/config/database';
```

🔍 **FIND:**
```typescript
// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});
```

✏️ **REPLACE WITH:**
```typescript
// Health check endpoint with database status
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Server is running but database is unavailable',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      database: 'disconnected',
    });
  }
});
```

---

### Step 9: Create Database Utility Functions

📁 **File:** `server/src/utils/database.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import { prisma } from '@/config/database';
import { logger } from './logger';

/**
 * Check if database is connected and accessible
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection check failed:', error);
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const [
      controlCount,
      assessmentCount,
      evidenceCount,
      poamCount,
      policyCount,
    ] = await Promise.all([
      prisma.control.count(),
      prisma.assessment.count(),
      prisma.evidence.count(),
      prisma.poam.count(),
      prisma.m365Policy.count(),
    ]);

    return {
      controls: controlCount,
      assessments: assessmentCount,
      evidence: evidenceCount,
      poams: poamCount,
      policies: policyCount,
    };
  } catch (error) {
    logger.error('Failed to get database stats:', error);
    throw error;
  }
}

/**
 * Clear all data from database (use with caution!)
 */
export async function clearDatabase(): Promise<void> {
  logger.warn('Clearing all data from database...');
  
  await prisma.changeHistory.deleteMany();
  await prisma.controlPolicyMapping.deleteMany();
  await prisma.poamMilestone.deleteMany();
  await prisma.poam.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.controlStatus.deleteMany();
  await prisma.m365Policy.deleteMany();
  await prisma.control.deleteMany();
  await prisma.setting.deleteMany();
  
  logger.info('Database cleared successfully');
}

/**
 * Reset database to initial state
 */
export async function resetDatabase(): Promise<void> {
  logger.warn('Resetting database...');
  await clearDatabase();
  // Seed script will be called separately
  logger.info('Database reset complete');
}
```

---

## Verification Steps

### 1. Check Database File Created

```bash
ls -lh ../database/
```

**Expected Output:**
```
-rw-r--r--  1 user  staff   8.0K Nov  6 10:00 compliance.db
```

### 2. Verify Tables Created

```bash
npx prisma studio
```

This opens Prisma Studio in your browser at `http://localhost:5555`

**Expected:**
- You should see all 10 tables listed
- All tables should be empty (no data yet)

### 3. Test Database Connection

Start the server:
```bash
npm run dev
```

Test health endpoint:
```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-11-06T...",
  "environment": "development",
  "database": "connected"
}
```

### 4. Check Prisma Client Generated

```bash
ls -la node_modules/.prisma/client/
```

**Expected:** Directory exists with generated client files

### 5. Verify TypeScript Types

```bash
npm run type-check
```

**Expected:** No errors (Prisma types should be available)

---

## Database Schema Overview

### Tables Created (10 total):

1. **controls** - All 110 NIST 800-171 controls
2. **control_status** - Implementation tracking per control
3. **assessments** - Compliance assessment results
4. **evidence** - Uploaded evidence file metadata
5. **poams** - Plan of Action & Milestones
6. **poam_milestones** - Individual POAM milestones
7. **m365_policies** - Synced Microsoft 365 policies
8. **control_policy_mappings** - Links M365 policies to controls
9. **change_history** - Audit trail of changes
10. **settings** - Application configuration

### Key Relationships:

```
Control (1) ──── (0..1) ControlStatus
  │
  ├──── (0..n) Assessment
  │
  ├──── (0..n) Evidence
  │
  ├──── (0..n) Poam ──── (0..n) PoamMilestone
  │
  ├──── (0..n) ControlPolicyMapping ──── (1) M365Policy
  │
  └──── (0..n) ChangeHistory
```

---

## Common Issues & Solutions

### Issue: Migration fails with "database locked"

**Solution:**
```bash
# Stop any running Prisma Studio instances
# Kill any processes using the database
rm ../database/compliance.db
npx prisma migrate dev --name init
```

### Issue: Prisma Client not found

**Solution:**
```bash
npx prisma generate
npm run type-check
```

### Issue: Cannot find module '@prisma/client'

**Solution:**
```bash
npm install @prisma/client
npx prisma generate
```

### Issue: Database file in wrong location

**Solution:**
Check `.env` file has correct path:
```env
DATABASE_URL="file:../database/compliance.db"
```

---

## File Structure After Phase 1.4

```
server/
├── prisma/
│   ├── schema.prisma              ✅ Complete schema
│   └── migrations/
│       └── 20251106XXXXXX_init/
│           └── migration.sql      ✅ Initial migration
├── src/
│   ├── config/
│   │   ├── index.ts
│   │   └── database.ts            ✅ NEW - DB connection
│   ├── types/
│   │   └── prisma.types.ts        ✅ NEW - Type exports
│   └── utils/
│       ├── logger.ts
│       └── database.ts            ✅ NEW - DB utilities
└── .env                           ✅ Updated with DB URL

database/
└── compliance.db                  ✅ NEW - SQLite database
```

---

## Next Steps

✅ **Phase 1.4 Complete!**

Proceed to **[Phase 1.5: NIST Controls Data Preparation](./phase1_05_controls_data.md)**

---

## Checklist

- [ ] Prisma initialized with SQLite
- [ ] Complete schema.prisma created with 10 tables
- [ ] DATABASE_URL configured correctly in .env
- [ ] Initial migration created and applied
- [ ] Database file created in database/ directory
- [ ] Prisma Client generated
- [ ] Database connection module created
- [ ] Type exports created
- [ ] Database utilities created
- [ ] Health endpoint includes database status
- [ ] Prisma Studio can open database
- [ ] Server connects to database successfully
- [ ] No TypeScript compilation errors

---

**Status:** Ready for Phase 1.5  
**Estimated Time:** 4-5 hours  
**Last Updated:** 2025-11-06
