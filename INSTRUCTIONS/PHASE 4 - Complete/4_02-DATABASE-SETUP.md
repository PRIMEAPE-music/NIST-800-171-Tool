# Phase 4 Part 1: Database Setup

## Objective
Set up Prisma schema for POAM and milestone tables, create migration, and test relationships.

## File Locations
- Schema: `/server/prisma/schema.prisma`
- Migration: Auto-generated in `/server/prisma/migrations/`

---

## Step 1: Update Prisma Schema

📁 `/server/prisma/schema.prisma`

### Add POAM and Milestone Models

Add these models to the existing schema file (after the Control model):

```prisma
model Poam {
  id                   Int               @id @default(autoincrement())
  controlId            Int
  gapDescription       String
  remediationPlan      String
  assignedTo           String?
  priority             String            @default("Medium") // High, Medium, Low
  status               String            @default("Open")   // Open, In Progress, Completed, Risk Accepted
  startDate            DateTime?
  targetCompletionDate DateTime?
  actualCompletionDate DateTime?
  resourcesRequired    String?
  budgetEstimate       Float?
  riskAcceptanceNotes  String?
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt
  
  control              Control           @relation(fields: [controlId], references: [id], onDelete: Cascade)
  milestones           PoamMilestone[]
  
  @@index([controlId])
  @@index([status])
  @@index([priority])
  @@map("poams")
}

model PoamMilestone {
  id                   Int       @id @default(autoincrement())
  poamId               Int
  milestoneDescription String
  dueDate              DateTime
  completionDate       DateTime?
  status               String    @default("Pending") // Pending, In Progress, Completed
  notes                String?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  
  poam                 Poam      @relation(fields: [poamId], references: [id], onDelete: Cascade)
  
  @@index([poamId])
  @@index([status])
  @@map("poam_milestones")
}
```

### Update Control Model

Add the POAM relation to the existing Control model:

🔍 **FIND** in Control model:
```prisma
model Control {
  id              Int       @id @default(autoincrement())
  controlId       String    @unique
  // ... other fields ...
  
  @@map("controls")
}
```

✏️ **REPLACE WITH:**
```prisma
model Control {
  id              Int       @id @default(autoincrement())
  controlId       String    @unique
  // ... other fields ...
  
  poams           Poam[]
  
  @@map("controls")
}
```

---

## Step 2: Create and Run Migration

Run these commands from the `/server` directory:

```bash
# Format the schema (optional but recommended)
npx prisma format

# Create migration
npx prisma migrate dev --name add_poam_tables

# Generate Prisma Client
npx prisma generate
```

**Expected Output:**
- New migration file created in `/server/prisma/migrations/`
- Database updated with new tables
- Prisma Client regenerated with new types

---

## Step 3: Verify Database Schema

### Check Tables

Run this command to open Prisma Studio:

```bash
npx prisma studio
```

**Verify:**
- ✅ `poams` table exists
- ✅ `poam_milestones` table exists
- ✅ Foreign key from `poams.controlId` to `controls.id`
- ✅ Foreign key from `poam_milestones.poamId` to `poams.id`
- ✅ Indexes on `controlId`, `status`, `priority`

### Test Relationships (Optional SQL Queries)

If you want to test directly in SQLite:

```bash
cd server
sqlite3 ../database/compliance.db
```

```sql
-- Check table structure
.schema poams
.schema poam_milestones

-- Test foreign key constraints
PRAGMA foreign_keys;
PRAGMA foreign_key_list(poams);
PRAGMA foreign_key_list(poam_milestones);
```

---

## Step 4: Create TypeScript Types

📁 `/server/src/types/poam.types.ts`

🔄 **CREATE NEW FILE:**

```typescript
import { Poam, PoamMilestone } from '@prisma/client';

export type PoamWithMilestones = Poam & {
  milestones: PoamMilestone[];
};

export type PoamWithControl = Poam & {
  control: {
    id: number;
    controlId: string;
    title: string;
    family: string;
  };
  milestones: PoamMilestone[];
};

export enum PoamStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  RISK_ACCEPTED = 'Risk Accepted',
}

export enum PoamPriority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export enum MilestoneStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
}

export interface CreatePoamDto {
  controlId: number;
  gapDescription: string;
  remediationPlan: string;
  assignedTo?: string;
  priority?: PoamPriority;
  status?: PoamStatus;
  startDate?: Date | string;
  targetCompletionDate?: Date | string;
  resourcesRequired?: string;
  budgetEstimate?: number;
}

export interface UpdatePoamDto {
  gapDescription?: string;
  remediationPlan?: string;
  assignedTo?: string;
  priority?: PoamPriority;
  status?: PoamStatus;
  startDate?: Date | string;
  targetCompletionDate?: Date | string;
  actualCompletionDate?: Date | string;
  resourcesRequired?: string;
  budgetEstimate?: number;
  riskAcceptanceNotes?: string;
}

export interface CreateMilestoneDto {
  milestoneDescription: string;
  dueDate: Date | string;
  status?: MilestoneStatus;
  notes?: string;
}

export interface UpdateMilestoneDto {
  milestoneDescription?: string;
  dueDate?: Date | string;
  completionDate?: Date | string;
  status?: MilestoneStatus;
  notes?: string;
}

export interface PoamFilters {
  status?: PoamStatus;
  priority?: PoamPriority;
  controlId?: number;
  assignedTo?: string;
  overdue?: boolean;
}

export interface PoamStats {
  total: number;
  byStatus: Record<PoamStatus, number>;
  byPriority: Record<PoamPriority, number>;
  overdue: number;
  completedThisMonth: number;
}
```

---

## Step 5: Seed Test Data (Optional)

📁 `/server/prisma/seed.ts`

Add POAM seed data to the existing seed file:

```typescript
// Add this after seeding controls
async function seedPoams() {
  console.log('Seeding POAMs...');
  
  // Get some control IDs to link POAMs to
  const controls = await prisma.control.findMany({
    take: 5,
    where: {
      status: { not: 'Implemented' }
    }
  });
  
  if (controls.length === 0) {
    console.log('No non-implemented controls found, skipping POAM seed');
    return;
  }
  
  const poams = [
    {
      controlId: controls[0].id,
      gapDescription: 'Multi-factor authentication not enforced for all users',
      remediationPlan: 'Deploy conditional access policies via Intune to enforce MFA for all user accounts',
      assignedTo: 'IT Security Team',
      priority: 'High',
      status: 'In Progress',
      startDate: new Date('2024-11-01'),
      targetCompletionDate: new Date('2024-12-15'),
      resourcesRequired: 'Azure AD Premium P1 licenses, 40 hours implementation time',
      budgetEstimate: 5000,
      milestones: {
        create: [
          {
            milestoneDescription: 'Purchase Azure AD Premium licenses',
            dueDate: new Date('2024-11-15'),
            status: 'Completed',
            completionDate: new Date('2024-11-10'),
          },
          {
            milestoneDescription: 'Configure conditional access policies',
            dueDate: new Date('2024-11-30'),
            status: 'In Progress',
          },
          {
            milestoneDescription: 'User training and communication',
            dueDate: new Date('2024-12-10'),
            status: 'Pending',
          },
        ],
      },
    },
    {
      controlId: controls[1].id,
      gapDescription: 'Lack of centralized audit logging for security events',
      remediationPlan: 'Implement Microsoft Purview Audit (Premium) and configure log retention policies',
      assignedTo: 'Compliance Team',
      priority: 'Medium',
      status: 'Open',
      targetCompletionDate: new Date('2025-02-01'),
      resourcesRequired: 'Purview Audit licenses, storage for log retention',
      budgetEstimate: 3000,
      milestones: {
        create: [
          {
            milestoneDescription: 'Evaluate audit logging requirements',
            dueDate: new Date('2024-12-01'),
            status: 'Pending',
          },
          {
            milestoneDescription: 'Purchase Purview licenses',
            dueDate: new Date('2024-12-15'),
            status: 'Pending',
          },
        ],
      },
    },
  ];
  
  for (const poamData of poams) {
    await prisma.poam.create({
      data: poamData,
    });
  }
  
  console.log(`Seeded ${poams.length} POAMs with milestones`);
}

// Add to main seed function
async function main() {
  // ... existing seed logic ...
  
  await seedPoams();
}
```

Run seed:
```bash
npx prisma db seed
```

---

## Step 6: Verification Tests

Create a test file to verify relationships work:

📁 `/server/src/tests/poam-relationships.test.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPoamRelationships() {
  console.log('Testing POAM relationships...\n');
  
  // Test 1: Create POAM with milestones
  const control = await prisma.control.findFirst();
  if (!control) {
    console.error('No controls found in database');
    return;
  }
  
  const poam = await prisma.poam.create({
    data: {
      controlId: control.id,
      gapDescription: 'Test gap description',
      remediationPlan: 'Test remediation plan',
      priority: 'High',
      milestones: {
        create: [
          {
            milestoneDescription: 'Test milestone 1',
            dueDate: new Date('2025-01-01'),
          },
          {
            milestoneDescription: 'Test milestone 2',
            dueDate: new Date('2025-02-01'),
          },
        ],
      },
    },
    include: {
      milestones: true,
      control: true,
    },
  });
  
  console.log('✅ Created POAM with milestones:', {
    id: poam.id,
    milestoneCount: poam.milestones.length,
    linkedControl: poam.control.controlId,
  });
  
  // Test 2: Query POAM with relations
  const poamWithRelations = await prisma.poam.findUnique({
    where: { id: poam.id },
    include: {
      milestones: true,
      control: {
        select: {
          controlId: true,
          title: true,
          family: true,
        },
      },
    },
  });
  
  console.log('✅ Retrieved POAM with relations:', {
    poamId: poamWithRelations?.id,
    milestones: poamWithRelations?.milestones.length,
    controlInfo: poamWithRelations?.control,
  });
  
  // Test 3: Update milestone
  const milestone = poam.milestones[0];
  const updatedMilestone = await prisma.poamMilestone.update({
    where: { id: milestone.id },
    data: {
      status: 'Completed',
      completionDate: new Date(),
    },
  });
  
  console.log('✅ Updated milestone status:', {
    milestoneId: updatedMilestone.id,
    status: updatedMilestone.status,
  });
  
  // Test 4: Delete POAM (should cascade to milestones)
  await prisma.poam.delete({
    where: { id: poam.id },
  });
  
  const orphanedMilestones = await prisma.poamMilestone.count({
    where: { poamId: poam.id },
  });
  
  console.log('✅ Cascade delete test:', {
    orphanedMilestones: orphanedMilestones, // Should be 0
  });
  
  console.log('\n✅ All relationship tests passed!');
}

testPoamRelationships()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run test:
```bash
npx ts-node src/tests/poam-relationships.test.ts
```

---

## Common Issues & Solutions

### Issue: Migration fails with foreign key error
**Solution:** Ensure Control model exists and has correct @@map("controls")

### Issue: Prisma types not updating
**Solution:** Run `npx prisma generate` again

### Issue: Cannot find @prisma/client
**Solution:** Run `npm install @prisma/client`

---

## Completion Checklist

- [ ] Prisma schema updated with Poam and PoamMilestone models
- [ ] Control model has poams relation
- [ ] Migration created and applied
- [ ] Prisma Client regenerated
- [ ] Database tables verified in Prisma Studio
- [ ] TypeScript types created
- [ ] (Optional) Test data seeded
- [ ] (Optional) Relationship tests passed

---

## Next Steps
Proceed to **02-BACKEND-API.md** to implement the backend routes, controllers, and services.
