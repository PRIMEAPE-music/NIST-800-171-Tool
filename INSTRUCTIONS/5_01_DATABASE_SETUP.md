# Phase 5: Database Setup - Evidence Schema

## Overview
This document covers the database schema updates needed for evidence management, including the Evidence model and its relationships to Controls.

## Prisma Schema Updates

### Evidence Model
Add the following model to `server/src/models/schema.prisma`:

```prisma
model Evidence {
  id            String   @id @default(uuid())
  controlId     String
  fileName      String   // Stored file name (sanitized + timestamp)
  originalName  String   // Original uploaded file name
  filePath      String   // Relative path from uploads directory
  fileType      String   // MIME type (application/pdf, image/png, etc.)
  fileSize      Int      // Size in bytes
  description   String?  // Optional user description
  uploadedBy    String?  // User who uploaded (optional for single-user app)
  uploadedDate  DateTime @default(now())
  version       Int      @default(1)
  tags          String?  // JSON array stored as string: ["policy", "audit"]
  isArchived    Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relationship to Control
  control       Control  @relation(fields: [controlId], references: [id], onDelete: Cascade)
  
  // Indexes for performance
  @@index([controlId])
  @@index([uploadedDate])
  @@index([fileType])
  
  @@map("evidence")
}
```

### Update Control Model
Add the evidence relationship to the existing Control model:

```prisma
model Control {
  id                String          @id @default(uuid())
  controlId         String          @unique  // e.g., "3.1.1"
  family            String          // e.g., "AC"
  title             String
  requirementText   String
  discussionText    String?
  priority          String          // Critical/High/Medium/Low
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  
  // Relationships
  status            ControlStatus?
  assessments       Assessment[]
  evidence          Evidence[]      // NEW: Add this line
  poams             POAM[]
  policyMappings    ControlPolicyMapping[]
  changeHistory     ChangeHistory[]
  
  @@map("controls")
}
```

## Migration Steps

### 1. Generate Migration
Run from the `/server` directory:

```bash
npx prisma migrate dev --name add_evidence_model
```

This will:
- Create a new migration file
- Update the SQLite database
- Regenerate Prisma Client types

### 2. Verify Migration
Check the generated migration file in `server/prisma/migrations/` to ensure it includes:
- CREATE TABLE for evidence
- Foreign key constraint to controls table
- Indexes on controlId, uploadedDate, and fileType

### 3. Test Database Connection
Create a test script to verify the Evidence model:

**File**: `server/src/scripts/test-evidence-model.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEvidenceModel() {
  try {
    // Test: Create a test control
    const testControl = await prisma.control.findFirst();
    
    if (!testControl) {
      console.error('No controls found. Run seed script first.');
      return;
    }
    
    // Test: Create evidence record
    const evidence = await prisma.evidence.create({
      data: {
        controlId: testControl.id,
        fileName: 'test_1234567890_policy.pdf',
        originalName: 'policy.pdf',
        filePath: '/uploads/AC/test_1234567890_policy.pdf',
        fileType: 'application/pdf',
        fileSize: 102400,
        description: 'Test evidence document',
        tags: JSON.stringify(['policy', 'test']),
      },
    });
    
    console.log('✅ Evidence created:', evidence);
    
    // Test: Query evidence with control
    const evidenceWithControl = await prisma.evidence.findUnique({
      where: { id: evidence.id },
      include: { control: true },
    });
    
    console.log('✅ Evidence with control:', evidenceWithControl);
    
    // Test: Delete evidence
    await prisma.evidence.delete({
      where: { id: evidence.id },
    });
    
    console.log('✅ Evidence deleted successfully');
    
  } catch (error) {
    console.error('❌ Error testing evidence model:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEvidenceModel();
```

Run the test:
```bash
cd server
npx ts-node src/scripts/test-evidence-model.ts
```

## TypeScript Types

### Evidence Interface
Create `server/src/types/evidence.types.ts`:

```typescript
export interface Evidence {
  id: string;
  controlId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  description?: string | null;
  uploadedBy?: string | null;
  uploadedDate: Date;
  version: number;
  tags?: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvidenceWithControl extends Evidence {
  control: {
    id: string;
    controlId: string;
    family: string;
    title: string;
  };
}

export interface CreateEvidenceInput {
  controlId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  description?: string;
  tags?: string[];
}

export interface UpdateEvidenceInput {
  description?: string;
  tags?: string[];
  isArchived?: boolean;
}

export interface EvidenceFilters {
  controlId?: string;
  family?: string;
  fileType?: string;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  isArchived?: boolean;
}

export interface EvidenceStats {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  controlsWithEvidence: number;
  controlsWithoutEvidence: number;
}
```

## Database Indexes Explanation

### Why These Indexes?
1. **@@index([controlId])**: Fast queries for "Get all evidence for control X"
2. **@@index([uploadedDate])**: Fast queries for recent uploads, date filtering
3. **@@index([fileType])**: Fast filtering by file type (e.g., "Show all PDFs")

### Query Performance
These indexes will optimize:
- Evidence library filters
- Control detail page evidence list
- Gap analysis (controls without evidence)
- Recent activity feeds

## Data Integrity

### Cascade Delete
The `onDelete: Cascade` on the control relationship means:
- If a control is deleted, all linked evidence records are also deleted
- This prevents orphaned evidence records
- File cleanup must be handled separately in the service layer

### File Path Validation
Always validate that:
- File paths don't contain `..` (path traversal)
- File paths start with the allowed uploads directory
- Referenced files actually exist on disk

## Seed Data (Optional)
If you want sample evidence for testing, add to your seed script:

```typescript
// In server/prisma/seed.ts
const sampleEvidence = [
  {
    controlId: '3.1.1', // Replace with actual UUID
    fileName: 'access_control_policy_1234567890.pdf',
    originalName: 'access_control_policy.pdf',
    filePath: '/uploads/AC/access_control_policy_1234567890.pdf',
    fileType: 'application/pdf',
    fileSize: 256000,
    description: 'Organization access control policy',
    tags: JSON.stringify(['policy', 'access-control']),
  },
  // Add more sample evidence...
];

for (const evidence of sampleEvidence) {
  await prisma.evidence.create({ data: evidence });
}
```

## Troubleshooting

### Common Issues

**Issue**: Migration fails with "table already exists"
**Solution**: 
```bash
npx prisma migrate reset
npx prisma migrate dev
npx prisma db seed
```

**Issue**: TypeScript errors after migration
**Solution**: 
```bash
npx prisma generate
npm run build
```

**Issue**: Can't find Evidence model in Prisma Client
**Solution**: Restart TypeScript server and regenerate client:
```bash
npx prisma generate
# Restart your IDE's TypeScript server
```

## Next Steps
Once the database schema is updated and tested, proceed to `03_BACKEND_IMPLEMENTATION.md` to implement the API layer.

## Checklist
- [ ] Added Evidence model to schema.prisma
- [ ] Updated Control model with evidence relationship
- [ ] Generated migration with `prisma migrate dev`
- [ ] Verified migration in database
- [ ] Created TypeScript types file
- [ ] Ran test script successfully
- [ ] Generated Prisma Client
- [ ] No TypeScript errors
- [ ] Ready for backend implementation
