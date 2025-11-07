# Claude Code: Execute Rev 3 Migration

This file contains direct, actionable instructions for Claude Code to migrate the NIST 800-171 Compliance Tracker from Revision 2 to Revision 3.

---

## Pre-Migration Checklist

Before starting, ensure you have:
- [x] NIST 800-171 Rev 3 controls JSON file at `/mnt/user-data/outputs/nist-controls.json`
- [ ] Backup of existing project (if any data exists)
- [ ] Git commit of current state

---

## Phase 1: Project Setup and Data Files

### Task 1.1: Copy Controls JSON to Project
```bash
# Create data directory if it doesn't exist
mkdir -p /path/to/nist-800-171-tracker/data

# Copy the Rev 3 controls file
cp /mnt/user-data/outputs/nist-controls.json /path/to/nist-800-171-tracker/data/nist-controls.json
```

### Task 1.2: Verify JSON File
```bash
cd /path/to/nist-800-171-tracker/data
node -e "const data = require('./nist-controls.json'); console.log('Controls:', data.controls.length); console.log('Families:', Object.keys(data.families).length);"
# Expected output: Controls: 108, Families: 17
```

---

## Phase 2: Update Documentation

### Task 2.1: Update PROJECT_OVERVIEW.md

Find and replace these sections:

📝 **Section: NIST 800-171 Control Families**
```markdown
FIND:
## NIST 800-171 Control Families (110 total)
AC(22), AT(3), AU(9), CA(9), CM(11), CP(3), IA(11), IR(5), MA(6), MP(7), PE(6), PS(8), RA(5), SC(13), SI(17)

REPLACE WITH:
## NIST 800-171 Rev 3 Control Families (110 total)
AC(22), AT(3), AU(9), CA(9), CM(11), CP(3), IA(11), IR(5), MA(6), MP(7), PE(6), PS(8), RA(5), SA(3), SC(13), SI(7), SR(3), PL(3)

Note: Rev 3 adds three new families (SA, SR, PL) and reorganizes controls from SI family.
```

📝 **Section: Version References**
```markdown
FIND: "NIST SP 800-171 Revision 2"
REPLACE WITH: "NIST SP 800-171 Revision 3"

FIND: "February 2020"
REPLACE WITH: "May 2024"

FIND: "14 families"
REPLACE WITH: "17 families"
```

### Task 2.2: Update NIST_Tool_Overview_Instructions.md

Update the family list section:
```markdown
FIND:
**Control Families (14 total):**
1. **AC** - Access Control (22 controls)
...
14. **SC** - System and Communications Protection (13 controls)
15. **SI** - System and Information Integrity (17 controls)

REPLACE WITH:
**Control Families (17 total):**
1. **AC** - Access Control (22 controls)
2. **AT** - Awareness and Training (3 controls)
3. **AU** - Audit and Accountability (9 controls)
4. **CA** - Assessment, Authorization, and Monitoring (9 controls)
5. **CM** - Configuration Management (11 controls)
6. **CP** - Contingency Planning (3 controls)
7. **IA** - Identification and Authentication (11 controls)
8. **IR** - Incident Response (5 controls)
9. **MA** - Maintenance (6 controls)
10. **MP** - Media Protection (7 controls)
11. **PE** - Physical Protection (6 controls)
12. **PS** - Personnel Security (8 controls)
13. **RA** - Risk Assessment (5 controls)
14. **SA** - System and Services Acquisition (3 controls)
15. **SC** - System and Communications Protection (13 controls)
16. **SI** - System and Information Integrity (7 controls)
17. **SR** - Supply Chain Risk Management (3 controls)
18. **PL** - Planning (3 controls)
```

### Task 2.3: Update README.md
Same find/replace operations as PROJECT_OVERVIEW.md

---

## Phase 3: Update Backend Types and Constants

### Task 3.1: Update server/src/types/controls.ts

📝 **File: `server/src/types/controls.ts`**

🔍 **FIND:**
```typescript
export type ControlFamily = 
  | 'AC' | 'AT' | 'AU' | 'CA' | 'CM' | 'CP' 
  | 'IA' | 'IR' | 'MA' | 'MP' | 'PE' | 'PS' 
  | 'RA' | 'SC' | 'SI';
```

✏️ **REPLACE WITH:**
```typescript
export type ControlFamily = 
  | 'AC' | 'AT' | 'AU' | 'CA' | 'CM' | 'CP' 
  | 'IA' | 'IR' | 'MA' | 'MP' | 'PE' | 'PS' 
  | 'RA' | 'SA' | 'SC' | 'SI' | 'SR' | 'PL';
```

🔍 **FIND:**
```typescript
export interface Control {
  id: string;
  controlId: string;
  family: ControlFamily;
  title: string;
  requirementText: string;
  discussionText?: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  createdAt: Date;
  updatedAt: Date;
}
```

✏️ **REPLACE WITH:**
```typescript
export interface Control {
  id: string;
  controlId: string; // Format: "03.01.01" for Rev 3
  family: ControlFamily;
  title: string;
  requirementText: string;
  discussionText?: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  revision: string; // "3" for Rev 3
  publicationDate: string; // "May 2024"
  createdAt: Date;
  updatedAt: Date;
}
```

### Task 3.2: Update server/src/constants/controls.ts

📝 **File: `server/src/constants/controls.ts`**

✏️ **COMPLETE REWRITE:**
```typescript
export const NIST_REVISION = '3';
export const NIST_VERSION = 'NIST SP 800-171 Revision 3';
export const PUBLICATION_DATE = 'May 2024';
export const TOTAL_CONTROLS = 110;

export const CONTROL_FAMILIES = {
  AC: { name: 'Access Control', controlCount: 22 },
  AT: { name: 'Awareness and Training', controlCount: 3 },
  AU: { name: 'Audit and Accountability', controlCount: 9 },
  CA: { name: 'Assessment, Authorization, and Monitoring', controlCount: 9 },
  CM: { name: 'Configuration Management', controlCount: 11 },
  CP: { name: 'Contingency Planning', controlCount: 3 },
  IA: { name: 'Identification and Authentication', controlCount: 11 },
  IR: { name: 'Incident Response', controlCount: 5 },
  MA: { name: 'Maintenance', controlCount: 6 },
  MP: { name: 'Media Protection', controlCount: 7 },
  PE: { name: 'Physical Protection', controlCount: 6 },
  PS: { name: 'Personnel Security', controlCount: 8 },
  RA: { name: 'Risk Assessment', controlCount: 5 },
  SA: { name: 'System and Services Acquisition', controlCount: 3 },
  SC: { name: 'System and Communications Protection', controlCount: 13 },
  SI: { name: 'System and Information Integrity', controlCount: 7 },
  SR: { name: 'Supply Chain Risk Management', controlCount: 3 },
  PL: { name: 'Planning', controlCount: 3 },
} as const;

export type ControlFamilyCode = keyof typeof CONTROL_FAMILIES;
```

---

## Phase 4: Update Frontend Types and Constants

### Task 4.1: Update client/src/types/controls.ts

📝 **File: `client/src/types/controls.ts`**

Perform the same changes as Task 3.1 (server types)

### Task 4.2: Update client/src/constants/controls.ts

📝 **File: `client/src/constants/controls.ts`**

Perform the same changes as Task 3.2 (server constants), adding color mappings:

✏️ **COMPLETE REWRITE:**
```typescript
export const NIST_REVISION = '3';
export const NIST_VERSION = 'NIST SP 800-171 Revision 3';
export const PUBLICATION_DATE = 'May 2024';
export const TOTAL_CONTROLS = 110;

export const CONTROL_FAMILIES = {
  AC: { name: 'Access Control', controlCount: 22, color: '#1976d2' },
  AT: { name: 'Awareness and Training', controlCount: 3, color: '#388e3c' },
  AU: { name: 'Audit and Accountability', controlCount: 9, color: '#f57c00' },
  CA: { name: 'Assessment, Authorization, and Monitoring', controlCount: 9, color: '#7b1fa2' },
  CM: { name: 'Configuration Management', controlCount: 11, color: '#c2185b' },
  CP: { name: 'Contingency Planning', controlCount: 3, color: '#0097a7' },
  IA: { name: 'Identification and Authentication', controlCount: 11, color: '#5d4037' },
  IR: { name: 'Incident Response', controlCount: 5, color: '#d32f2f' },
  MA: { name: 'Maintenance', controlCount: 6, color: '#303f9f' },
  MP: { name: 'Media Protection', controlCount: 7, color: '#689f38' },
  PE: { name: 'Physical Protection', controlCount: 6, color: '#fbc02d' },
  PS: { name: 'Personnel Security', controlCount: 8, color: '#0288d1' },
  RA: { name: 'Risk Assessment', controlCount: 5, color: '#e64a19' },
  SA: { name: 'System and Services Acquisition', controlCount: 3, color: '#00796b' },
  SC: { name: 'System and Communications Protection', controlCount: 13, color: '#512da8' },
  SI: { name: 'System and Information Integrity', controlCount: 7, color: '#c62828' },
  SR: { name: 'Supply Chain Risk Management', controlCount: 3, color: '#ad1457' },
  PL: { name: 'Planning', controlCount: 3, color: '#00695c' },
} as const;
```

---

## Phase 5: Update Database Schema

### Task 5.1: Update Prisma Schema

📝 **File: `server/prisma/schema.prisma`**

🔍 **FIND the Control model:**
```prisma
model Control {
  id                String   @id @default(uuid())
  controlId         String   @unique
  family            String
  title             String
  requirementText   String   @db.Text
  discussionText    String?  @db.Text
  priority          String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  // ... relations
}
```

✏️ **REPLACE WITH:**
```prisma
model Control {
  id                String   @id @default(uuid())
  controlId         String   @unique // Format: "03.01.01"
  family            String   // AC|AT|AU|CA|CM|CP|IA|IR|MA|MP|PE|PS|RA|SA|SC|SI|SR|PL
  title             String
  requirementText   String   @db.Text
  discussionText    String?  @db.Text
  priority          String
  revision          String   @default("3")
  publicationDate   String   @default("May 2024")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  status            ControlStatus[]
  assessments       Assessment[]
  evidence          Evidence[]
  poams             Poam[]
  policyMappings    ControlPolicyMapping[]

  @@index([family])
  @@index([priority])
  @@index([revision])
}
```

### Task 5.2: Create and Run Migration

```bash
cd server
npx prisma migrate dev --name update-to-nist-rev3
```

---

## Phase 6: Update Validation Schemas

### Task 6.1: Update Zod Schemas

📝 **File: `server/src/validation/controlSchemas.ts`**

✏️ **COMPLETE REWRITE:**
```typescript
import { z } from 'zod';

// Rev 3 control ID format: 03.01.01 (zero-padded)
export const controlIdSchema = z.string().regex(
  /^03\.\d{2}\.\d{2}$/,
  'Control ID must be in format: 03.01.01'
);

// Rev 3 families including new SA, SR, PL
export const controlFamilySchema = z.enum([
  'AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR',
  'MA', 'MP', 'PE', 'PS', 'RA', 'SA', 'SC', 'SI', 'SR', 'PL'
]);

export const prioritySchema = z.enum(['Critical', 'High', 'Medium', 'Low']);

export const controlSchema = z.object({
  controlId: controlIdSchema,
  family: controlFamilySchema,
  title: z.string().min(1, 'Title is required'),
  requirementText: z.string().min(1, 'Requirement text is required'),
  discussionText: z.string().optional(),
  priority: prioritySchema,
  revision: z.string().default('3'),
  publicationDate: z.string().default('May 2024'),
});

export const createControlSchema = controlSchema;
export const updateControlSchema = controlSchema.partial();
```

---

## Phase 7: Update Seed Script

### Task 7.1: Create/Update Seed Script

📝 **File: `server/prisma/seed.ts`**

✏️ **COMPLETE REWRITE:**
```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ControlData {
  controlId: string;
  family: string;
  title: string;
  requirementText: string;
  priority: string;
}

interface ControlsFile {
  version: string;
  publicationDate: string;
  totalControls: number;
  families: Record<string, { name: string; controlCount: number }>;
  controls: ControlData[];
}

async function seedControls() {
  console.log('🌱 Seeding NIST 800-171 Rev 3 controls...\n');

  // Read the controls JSON file
  const controlsFilePath = path.join(__dirname, '../../data/nist-controls.json');
  
  if (!fs.existsSync(controlsFilePath)) {
    throw new Error(`Controls file not found at: ${controlsFilePath}`);
  }

  const controlsData: ControlsFile = JSON.parse(
    fs.readFileSync(controlsFilePath, 'utf-8')
  );

  console.log(`📋 Loading ${controlsData.totalControls} controls from ${controlsData.version}\n`);

  // Optional: Clear existing controls (uncomment if needed)
  // console.log('🗑️  Clearing existing controls...');
  // await prisma.control.deleteMany();

  // Seed controls
  let successCount = 0;
  let errorCount = 0;

  for (const control of controlsData.controls) {
    try {
      const createdControl = await prisma.control.upsert({
        where: { controlId: control.controlId },
        update: {
          family: control.family,
          title: control.title,
          requirementText: control.requirementText,
          priority: control.priority,
          revision: '3',
          publicationDate: controlsData.publicationDate,
        },
        create: {
          controlId: control.controlId,
          family: control.family,
          title: control.title,
          requirementText: control.requirementText,
          priority: control.priority,
          revision: '3',
          publicationDate: controlsData.publicationDate,
        },
      });

      // Create default control status if it doesn't exist
      const existingStatus = await prisma.controlStatus.findFirst({
        where: { controlId: createdControl.id },
      });

      if (!existingStatus) {
        await prisma.controlStatus.create({
          data: {
            controlId: createdControl.id,
            status: 'Not Started',
          },
        });
      }

      successCount++;
      process.stdout.write(`\r✓ Seeded ${successCount}/${controlsData.totalControls} controls`);
    } catch (error) {
      errorCount++;
      console.error(`\n❌ Error seeding control ${control.controlId}:`, error);
    }
  }

  console.log(`\n\n✅ Seeding complete!`);
  console.log(`   ✓ Success: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   ✗ Errors: ${errorCount}`);
  }
  console.log(`   📊 Total: ${controlsData.totalControls}\n`);

  // Display family breakdown
  const familyCounts = await prisma.control.groupBy({
    by: ['family'],
    _count: true,
  });

  console.log('📊 Control Families:');
  familyCounts.forEach(({ family, _count }) => {
    const familyInfo = controlsData.families[family];
    console.log(`   ${family}: ${_count} controls - ${familyInfo?.name || 'Unknown'}`);
  });
}

seedControls()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Task 7.2: Update package.json Seed Script

📝 **File: `server/package.json`**

Ensure the seed script is configured:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

### Task 7.3: Run Seed Script

```bash
cd server
npx prisma db seed
```

Expected output:
```
🌱 Seeding NIST 800-171 Rev 3 controls...
📋 Loading 110 controls from NIST SP 800-171 Revision 3
✓ Seeded 108/110 controls
✅ Seeding complete!
```

---

## Phase 8: Update UI Components

### Task 8.1: Update Family Filter Component

📝 **File: `client/src/components/controls/ControlFilters.tsx`**

➕ **ADD the new families to the filter options:**

```typescript
const familyOptions = [
  { value: 'AC', label: 'AC - Access Control' },
  { value: 'AT', label: 'AT - Awareness and Training' },
  { value: 'AU', label: 'AU - Audit and Accountability' },
  { value: 'CA', label: 'CA - Assessment, Authorization, and Monitoring' },
  { value: 'CM', label: 'CM - Configuration Management' },
  { value: 'CP', label: 'CP - Contingency Planning' },
  { value: 'IA', label: 'IA - Identification and Authentication' },
  { value: 'IR', label: 'IR - Incident Response' },
  { value: 'MA', label: 'MA - Maintenance' },
  { value: 'MP', label: 'MP - Media Protection' },
  { value: 'PE', label: 'PE - Physical Protection' },
  { value: 'PS', label: 'PS - Personnel Security' },
  { value: 'RA', label: 'RA - Risk Assessment' },
  { value: 'SA', label: 'SA - System and Services Acquisition' }, // NEW
  { value: 'SC', label: 'SC - System and Communications Protection' },
  { value: 'SI', label: 'SI - System and Information Integrity' },
  { value: 'SR', label: 'SR - Supply Chain Risk Management' }, // NEW
  { value: 'PL', label: 'PL - Planning' }, // NEW
];
```

### Task 8.2: Update Dashboard Charts

📝 **File: `client/src/components/dashboard/FamilyBreakdownChart.tsx`**

Ensure the chart component uses the updated CONTROL_FAMILIES constant from `client/src/constants/controls.ts`. No code changes needed if using the constant properly.

---

## Phase 9: Verification and Testing

### Task 9.1: Verify Database

```bash
cd server
npx prisma studio
```

Check:
- [ ] Total controls = 110 (or 108 if 2 are still missing)
- [ ] New families SA, SR, PL exist
- [ ] Control IDs are in format `03.01.01`
- [ ] All controls have revision = "3"

### Task 9.2: Run Backend Tests

```bash
cd server
npm run test
npm run lint
npx prisma validate
```

### Task 9.3: Run Frontend Tests

```bash
cd client
npm run test
npm run lint
npm run type-check
```

### Task 9.4: Manual Testing

Start the application and verify:
- [ ] Dashboard shows all 17 families
- [ ] Family filter dropdown includes SA, SR, PL
- [ ] Control Library displays controls correctly
- [ ] Control detail pages show Rev 3 control IDs
- [ ] Statistics show correct counts (AC: 22, SI: 7, etc.)
- [ ] No console errors

---

## Phase 10: Final Steps

### Task 10.1: Create Verification Script

📝 **File: `data/verify-rev3.js`**

```javascript
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'nist-controls.json'), 'utf8'));

console.log('═══════════════════════════════════════════');
console.log('  NIST 800-171 Rev 3 Verification');
console.log('═══════════════════════════════════════════');
console.log(`Version: ${data.version}`);
console.log(`Publication: ${data.publicationDate}`);
console.log(`Total Controls: ${data.controls.length}/${data.totalControls}`);
console.log(`Families: ${Object.keys(data.families).length}/17`);
console.log('');
console.log('Family Breakdown:');
Object.entries(data.families).forEach(([code, info]) => {
  const actualCount = data.controls.filter(c => c.family === code).length;
  const status = actualCount === info.controlCount ? '✓' : '✗';
  console.log(`  ${status} ${code}: ${actualCount}/${info.controlCount} - ${info.name}`);
});
```

### Task 10.2: Run Verification

```bash
cd data
node verify-rev3.js
```

### Task 10.3: Git Commit

```bash
git add .
git commit -m "Migrate to NIST 800-171 Revision 3

- Updated control IDs to Rev 3 format (03.01.01)
- Added new families: SA, SR, PL
- Updated database schema with revision tracking
- Updated all type definitions and constants
- Seeded database with 108/110 Rev 3 controls
- Updated documentation to reference Rev 3"
```

---

## Completion Checklist

Before considering migration complete, verify:

### Documentation
- [ ] PROJECT_OVERVIEW.md references Rev 3
- [ ] README.md references Rev 3
- [ ] NIST_Tool_Overview_Instructions.md updated

### Data
- [ ] nist-controls.json in data/ directory
- [ ] JSON contains 108+ controls
- [ ] All controls have Rev 3 format IDs

### Backend
- [ ] Prisma schema includes SA, SR, PL families
- [ ] Migration executed successfully
- [ ] Seed script completed
- [ ] Database has 108+ controls
- [ ] Types updated (server/src/types/controls.ts)
- [ ] Constants updated (server/src/constants/controls.ts)
- [ ] Validation schemas updated
- [ ] No TypeScript errors
- [ ] Tests pass

### Frontend
- [ ] Types updated (client/src/types/controls.ts)
- [ ] Constants updated (client/src/constants/controls.ts)
- [ ] Family filters show all 17 families
- [ ] Dashboard displays correctly
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Tests pass

### Manual Testing
- [ ] Application starts successfully
- [ ] Can view all controls
- [ ] Can filter by all families including SA, SR, PL
- [ ] Dashboard shows correct statistics
- [ ] Control detail pages work
- [ ] No runtime errors

---

## If Something Goes Wrong

### Rollback Database
```bash
cd server
npx prisma migrate reset
# Then run previous migration
```

### Restore Types
Use git to restore previous versions:
```bash
git checkout HEAD -- server/src/types/controls.ts
git checkout HEAD -- client/src/types/controls.ts
```

### Clear and Reseed
```bash
cd server
npx prisma migrate reset
npx prisma db seed
```

---

## Success!

If all tasks complete successfully, you now have:
- ✅ NIST 800-171 Revision 3 compliance tracker
- ✅ 108+ controls in database
- ✅ 17 control families (including SA, SR, PL)
- ✅ Rev 3 control ID format (03.01.01)
- ✅ Updated documentation
- ✅ Working application

You're now ready to proceed to **Phase 2: Core Control Management** of your project!

---

**Questions or Issues?**
Refer to the comprehensive migration guide at `/mnt/user-data/outputs/REV3_MIGRATION_GUIDE.md`