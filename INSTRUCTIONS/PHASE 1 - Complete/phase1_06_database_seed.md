# Phase 1.6: Database Seeding

## Objective
Create seed script to populate database with all 111 NIST 800-171 Rev 3 controls and initial control status records.

**Duration:** 2-3 hours
**Prerequisites:** Phase 1.5 complete (all 111 Rev 3 controls in JSON)
**Dependencies:** Prisma, SQLite database

---

## Tasks Overview

1. ✅ Create Prisma seed script
2. ✅ Import controls from JSON file
3. ✅ Create initial control_status records for each control
4. ✅ Add seed script to package.json
5. ✅ Run seed and verify data
6. ✅ Create database query utilities

---

## Step-by-Step Instructions

### Step 1: Configure Prisma Seed in Package.json

📁 **File:** `server/package.json`

🔍 **FIND:**
```json
  "scripts": {
```

➕ **ADD AFTER the scripts object (at same level as "scripts"):**
```json
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  },
```

---

### Step 2: Create Seed Script

📁 **File:** `server/prisma/seed.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface Control {
  controlId: string;
  family: string;
  title: string;
  requirementText: string;
  discussionText?: string;
  priority: string;
}

interface ControlsData {
  metadata: {
    standard: string;
    revision: string;
    totalControls: number;
  };
  controls: Control[];
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Read controls from JSON file
    const dataPath = path.resolve(__dirname, '../../data/nist-800-171-controls.json');
    
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Controls data file not found at: ${dataPath}`);
    }

    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const controlsData: ControlsData = JSON.parse(fileContent);

    console.log(`📚 Found ${controlsData.controls.length} Rev 3 controls to import\n`);

    // Check if controls already exist
    const existingCount = await prisma.control.count();
    if (existingCount > 0) {
      console.log(`⚠️  Database already contains ${existingCount} controls`);
      console.log('   Delete existing data? (This will reset the database)\n');
      
      // Clear existing data
      console.log('🗑️  Clearing existing data...');
      await prisma.changeHistory.deleteMany();
      await prisma.controlPolicyMapping.deleteMany();
      await prisma.poamMilestone.deleteMany();
      await prisma.poam.deleteMany();
      await prisma.evidence.deleteMany();
      await prisma.assessment.deleteMany();
      await prisma.controlStatus.deleteMany();
      await prisma.control.deleteMany();
      console.log('✅ Existing data cleared\n');
    }

    // Import controls
    console.log('📥 Importing controls...');
    let successCount = 0;
    let errorCount = 0;

    for (const control of controlsData.controls) {
      try {
        // Create control
        const createdControl = await prisma.control.create({
          data: {
            controlId: control.controlId,
            family: control.family,
            title: control.title,
            requirementText: control.requirementText,
            discussionText: control.discussionText || null,
            priority: control.priority,
          },
        });

        // Create initial control status
        await prisma.controlStatus.create({
          data: {
            controlId: createdControl.id,
            status: 'Not Started',
            assignedTo: null,
            implementationNotes: null,
          },
        });

        successCount++;
        
        // Progress indicator
        if (successCount % 10 === 0) {
          console.log(`   Imported ${successCount}/${controlsData.controls.length} controls...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Failed to import control ${control.controlId}:`, error);
      }
    }

    console.log(`\n✅ Import complete!`);
    console.log(`   Success: ${successCount} controls`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} controls`);
    }

    // Add some initial settings
    console.log('\n⚙️  Creating initial settings...');
    await prisma.setting.upsert({
      where: { settingKey: 'app_initialized' },
      update: { settingValue: 'true' },
      create: {
        settingKey: 'app_initialized',
        settingValue: 'true',
      },
    });

    await prisma.setting.upsert({
      where: { settingKey: 'last_seed_date' },
      update: { settingValue: new Date().toISOString() },
      create: {
        settingKey: 'last_seed_date',
        settingValue: new Date().toISOString(),
      },
    });

    console.log('✅ Settings created\n');

    // Display summary
    console.log('📊 Database Summary:');
    const stats = {
      controls: await prisma.control.count(),
      controlStatuses: await prisma.controlStatus.count(),
      settings: await prisma.setting.count(),
    };

    console.log(`   Controls: ${stats.controls}`);
    console.log(`   Control Statuses: ${stats.controlStatuses}`);
    console.log(`   Settings: ${stats.settings}`);

    // Verify control families
    console.log('\n📋 Controls by Family:');
    const families = await prisma.control.groupBy({
      by: ['family'],
      _count: true,
    });

    families.sort((a, b) => a.family.localeCompare(b.family));
    for (const family of families) {
      console.log(`   ${family.family}: ${family._count} controls`);
    }

    console.log('\n🎉 Database seeding completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

### Step 3: Run Database Seed

```bash
cd server
npx prisma db seed
```

**Expected Output:**
```
🌱 Starting database seed...

📚 Found 111 Rev 3 controls to import

📥 Importing controls...
   Imported 10/111 controls...
   Imported 20/111 controls...
   ...
   Imported 111/111 controls...

✅ Import complete!
   Success: 111 controls

⚙️  Creating initial settings...
✅ Settings created

📊 Database Summary:
   Controls: 111
   Control Statuses: 111
   Settings: 2

📋 Controls by Family (Rev 3 - 18 families):
   AC: 17 controls
   AT: 3 controls
   AU: 9 controls
   CA: 7 controls
   CM: 8 controls
   CP: 2 controls
   IA: 10 controls
   IR: 5 controls
   MA: 4 controls
   MP: 6 controls
   PE: 5 controls
   PL: 3 controls (NEW in Rev 3)
   PS: 6 controls
   RA: 5 controls
   SA: 3 controls (NEW in Rev 3)
   SC: 10 controls
   SI: 5 controls
   SR: 3 controls (NEW in Rev 3)

🎉 Database seeding completed successfully!
```

---

### Step 4: Create Database Query Service

📁 **File:** `server/src/services/controlService.ts`

🔄 **COMPLETE REWRITE:**
```typescript
import { prisma } from '@/config/database';
import { Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';

export class ControlService {
  /**
   * Get all controls with optional filtering
   */
  async getAllControls(filters?: {
    family?: string;
    status?: string;
    priority?: string;
    search?: string;
  }) {
    try {
      const where: Prisma.ControlWhereInput = {};

      if (filters?.family) {
        where.family = filters.family;
      }

      if (filters?.priority) {
        where.priority = filters.priority;
      }

      if (filters?.search) {
        where.OR = [
          { controlId: { contains: filters.search } },
          { title: { contains: filters.search } },
          { requirementText: { contains: filters.search } },
        ];
      }

      const controls = await prisma.control.findMany({
        where,
        include: {
          status: true,
        },
        orderBy: {
          controlId: 'asc',
        },
      });

      // Filter by status if provided (since it's in related table)
      if (filters?.status) {
        return controls.filter(
          (control) => control.status?.status === filters.status
        );
      }

      return controls;
    } catch (error) {
      logger.error('Error fetching controls:', error);
      throw error;
    }
  }

  /**
   * Get control by ID with all relations
   */
  async getControlById(id: number) {
    try {
      return await prisma.control.findUnique({
        where: { id },
        include: {
          status: true,
          assessments: {
            orderBy: { assessmentDate: 'desc' },
            take: 5,
          },
          evidence: true,
          poams: {
            include: {
              milestones: true,
            },
          },
          policyMappings: {
            include: {
              policy: true,
            },
          },
          changeHistory: {
            orderBy: { changedAt: 'desc' },
            take: 10,
          },
        },
      });
    } catch (error) {
      logger.error(`Error fetching control ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get control by control ID (e.g., "03.01.01" for Rev 3)
   */
  async getControlByControlId(controlId: string) {
    try {
      return await prisma.control.findUnique({
        where: { controlId },
        include: {
          status: true,
          assessments: {
            orderBy: { assessmentDate: 'desc' },
            take: 5,
          },
          evidence: true,
          poams: {
            include: {
              milestones: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error(`Error fetching control ${controlId}:`, error);
      throw error;
    }
  }

  /**
   * Get compliance statistics
   */
  async getComplianceStats() {
    try {
      const total = await prisma.control.count();
      
      const statuses = await prisma.controlStatus.groupBy({
        by: ['status'],
        _count: true,
      });

      const statusCounts: Record<string, number> = {
        'Not Started': 0,
        'In Progress': 0,
        'Implemented': 0,
        'Verified': 0,
      };

      statuses.forEach((s) => {
        statusCounts[s.status] = s._count;
      });

      const familyStats = await prisma.control.groupBy({
        by: ['family'],
        _count: true,
      });

      const priorityStats = await prisma.control.groupBy({
        by: ['priority'],
        _count: true,
      });

      return {
        total,
        byStatus: statusCounts,
        byFamily: familyStats,
        byPriority: priorityStats,
        compliancePercentage: Math.round(
          ((statusCounts['Implemented'] + statusCounts['Verified']) / total) * 100
        ),
      };
    } catch (error) {
      logger.error('Error fetching compliance stats:', error);
      throw error;
    }
  }
}

export const controlService = new ControlService();
```

---

## Verification Steps

### 1. Verify Seed Completed Successfully

```bash
cd server
npx prisma db seed
```

Check for success message and no errors.

### 2. Check Database with Prisma Studio

```bash
npx prisma studio
```

**Verify:**
- `controls` table has 110 records
- `control_status` table has 110 records
- All families represented (AC, AT, AU, etc.)
- All priorities assigned

### 3. Query Database Directly

```bash
# Count controls
npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM controls;"

# Count by family
npx prisma db execute --stdin <<< "SELECT family, COUNT(*) as count FROM controls GROUP BY family ORDER BY family;"
```

### 4. Test Control Service

Create test file:

📁 **File:** `server/src/test-seed.ts`

```typescript
import { controlService } from './services/controlService';
import { prisma } from './config/database';

async function test() {
  console.log('Testing seeded data...\n');

  // Get stats
  const stats = await controlService.getComplianceStats();
  console.log('📊 Compliance Stats:', stats);

  // Get first control (Rev 3 format)
  const control = await controlService.getControlByControlId('03.01.01');
  console.log('\n📄 Sample Control:', {
    id: control?.controlId,
    title: control?.title,
    status: control?.status?.status,
  });

  await prisma.$disconnect();
}

test();
```

Run:
```bash
npx ts-node src/test-seed.ts
```

---

## Common Issues & Solutions

### Issue: "Controls data file not found"

**Solution:**
```bash
# Verify file exists
ls -la ../data/nist-800-171-controls.json

# Check path in seed.ts is correct
# Should be: ../../data/nist-800-171-controls.json
```

### Issue: "Seed script not found"

**Solution:**
```bash
# Ensure ts-node is installed
npm install -D ts-node

# Verify package.json prisma.seed is set correctly
cat package.json | grep -A 2 "prisma"
```

### Issue: Duplicate key errors

**Solution:**
```bash
# Reset database
npx prisma migrate reset

# Reseed
npx prisma db seed
```

### Issue: Only partial data imported

**Solution:**
Check that `nist-800-171-controls.json` has all 111 Rev 3 controls:
```bash
cat ../data/nist-800-171-controls.json | jq '.controls | length'
# Should output: 111
```

---

## Next Steps

✅ **Phase 1.6 Complete!**

Proceed to **[Phase 1.7: React Router & Layout](./phase1_07_routing_layout.md)**

---

## Checklist

- [ ] Prisma seed configuration added to package.json
- [ ] seed.ts script created in prisma/ directory
- [ ] Seed script successfully imports all 111 Rev 3 controls
- [ ] Each control has corresponding control_status record
- [ ] Initial settings created (app_initialized, last_seed_date)
- [ ] Prisma Studio shows 111 controls
- [ ] All 18 families represented (including SA, SR, PL)
- [ ] Control IDs in Rev 3 format (03.XX.YY)
- [ ] Control service created with query methods
- [ ] Test queries return expected data
- [ ] No duplicate control IDs

---

**Status:** Ready for Phase 1.7  
**Estimated Time:** 2-3 hours  
**Last Updated:** 2025-11-06
