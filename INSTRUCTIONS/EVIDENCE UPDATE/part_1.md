# 📋 NIST Compliance App: Enhanced Evidence Library Implementation

**Goal:** Implement comprehensive multi-control evidence mapping system with advanced features including smart suggestions, analytics, validation workflows, and manual review evidence integration.

**Approach:** Hybrid architecture combining flexible evidence mapping with structured requirement tracking.

---

## 🎯 PHASE 1: Database Schema Changes

### Step 1.1: Update Prisma Schema

📁 **File:** `server/prisma/schema.prisma`

🔍 **FIND:** The Evidence model (around line 115)
```prisma
model Evidence {
  id           Int      @id @default(autoincrement())
  controlId    Int      @map("control_id")
  fileName     String   @map("file_name")
  originalName String   @map("original_name")
  filePath     String   @map("file_path")
  fileType     String   @map("file_type")
  fileSize     Int      @map("file_size")
  description  String?
  uploadedBy   String?  @map("uploaded_by")
  uploadedDate DateTime @default(now()) @map("uploaded_date")
  version      Int      @default(1)
  tags         String?
  isArchived   Boolean  @default(false) @map("is_archived")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  control Control @relation(fields: [controlId], references: [id], onDelete: Cascade)
  manualReviewLinks ManualReviewEvidence[]

  @@index([controlId])
  @@index([uploadedDate])
  @@index([fileType])
  @@map("evidence")
}
```

✏️ **REPLACE WITH:**
```prisma
model Evidence {
  id           Int      @id @default(autoincrement())
  
  // DEPRECATED: Keep for backward compatibility during migration
  controlId    Int?     @map("control_id") // Made optional - use controlMappings instead
  
  // File information
  fileName     String   @map("file_name")
  originalName String   @map("original_name")
  filePath     String   @map("file_path")
  fileType     String   @map("file_type")
  fileSize     Int      @map("file_size")
  
  // Evidence classification
  evidenceType String   @default("general") @map("evidence_type") // 'policy', 'procedure', 'execution', 'screenshot', 'log', 'report', 'configuration', 'general'
  
  // Metadata
  description  String?
  uploadedBy   String?  @map("uploaded_by")
  uploadedDate DateTime @default(now()) @map("uploaded_date")
  
  // Versioning
  version      Int      @default(1)
  parentId     Int?     @map("parent_id") // Link to previous version
  
  // Categorization
  tags         String?  // JSON array stored as string: ["policy", "audit", "annual-review"]
  
  // Status tracking
  status       String   @default("uploaded") // 'uploaded', 'under_review', 'approved', 'rejected', 'expired'
  reviewedBy   String?  @map("reviewed_by")
  reviewedAt   DateTime? @map("reviewed_at")
  reviewNotes  String?  @map("review_notes")
  
  // Archival
  isArchived   Boolean  @default(false) @map("is_archived")
  archivedBy   String?  @map("archived_by")
  archivedAt   DateTime? @map("archived_at")
  archivedReason String? @map("archived_reason")
  
  // Timestamps
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations - NEW: Many-to-many with controls
  control           Control?                 @relation("LegacyEvidenceControl", fields: [controlId], references: [id], onDelete: SetNull)
  controlMappings   EvidenceControlMapping[] // NEW: Multi-control mapping
  manualReviewLinks ManualReviewEvidence[]

  @@index([controlId])
  @@index([uploadedDate])
  @@index([fileType])
  @@index([evidenceType])
  @@index([status])
  @@index([isArchived])
  @@map("evidence")
}
```

---

🔍 **FIND:** The Control model relations section (around line 55)
```prisma
  // Relations
  status          ControlStatus?
  assessments     Assessment[]
  evidence        Evidence[]
  poams           Poam[]
```

✏️ **REPLACE WITH:**
```prisma
  // Relations
  status          ControlStatus?
  assessments     Assessment[]
  evidence        Evidence[] @relation("LegacyEvidenceControl") // Legacy relation
  evidenceMappings EvidenceControlMapping[] // NEW: Multi-control evidence
  poams           Poam[]
```

---

➕ **ADD AFTER:** The Evidence model (after the @@map("evidence") line)

```prisma

// ============================================================================
// Evidence to Control Mappings (Many-to-Many)
// ============================================================================

model EvidenceControlMapping {
  id          Int      @id @default(autoincrement())
  evidenceId  Int      @map("evidence_id")
  controlId   Int      @map("control_id")
  
  // Relationship type
  relationship String   @default("supporting") // 'primary', 'supporting', 'referenced', 'supplementary'
  notes        String?  // Why this evidence supports this control
  
  // Link to formal requirement (optional - connects to EvidenceRequirement)
  requirementId Int?    @map("requirement_id")
  requirement   EvidenceRequirement? @relation(fields: [requirementId], references: [id], onDelete: SetNull)
  
  // Validation workflow
  isVerified   Boolean  @default(false) @map("is_verified")
  verifiedBy   String?  @map("verified_by")
  verifiedAt   DateTime? @map("verified_at")
  
  // Auto-suggested vs manual
  isSuggested  Boolean  @default(false) @map("is_suggested")
  suggestionScore Float? @map("suggestion_score") // 0-1 confidence score
  
  // Metadata
  mappedBy     String?  @map("mapped_by")
  mappedAt     DateTime @default(now()) @map("mapped_at")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  
  evidence     Evidence @relation(fields: [evidenceId], references: [id], onDelete: Cascade)
  control      Control  @relation(fields: [controlId], references: [id], onDelete: Cascade)
  
  @@unique([evidenceId, controlId])
  @@index([evidenceId])
  @@index([controlId])
  @@index([requirementId])
  @@index([isVerified])
  @@index([relationship])
  @@map("evidence_control_mappings")
}

// ============================================================================
// Evidence Templates (for auto-suggestions)
// ============================================================================

model EvidenceTemplate {
  id               Int      @id @default(autoincrement())
  name             String   @unique // e.g., "Information Security Policy"
  description      String?
  evidenceType     String   @map("evidence_type") // 'policy', 'procedure', 'execution', etc.
  
  // Suggested controls (JSON array of control IDs)
  suggestedControls String  @map("suggested_controls") // ["AC.01.01", "AC.01.02", ...]
  
  // Keywords for matching
  keywords         String   // JSON array: ["information", "security", "policy", "infosec"]
  
  // File type hints
  expectedFileTypes String? @map("expected_file_types") // JSON array: ["pdf", "docx"]
  
  // Default relationship when mapped
  defaultRelationship String @default("primary") @map("default_relationship")
  
  // Usage tracking
  timesUsed        Int      @default(0) @map("times_used")
  lastUsed         DateTime? @map("last_used")
  
  isActive         Boolean  @default(true) @map("is_active")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  
  @@index([evidenceType])
  @@index([isActive])
  @@map("evidence_templates")
}

// ============================================================================
// Evidence Upload Sessions (for bulk operations)
// ============================================================================

model EvidenceUploadSession {
  id               Int      @id @default(autoincrement())
  sessionId        String   @unique @map("session_id") // UUID for tracking
  
  // Session metadata
  uploadedBy       String?  @map("uploaded_by")
  totalFiles       Int      @default(0) @map("total_files")
  successfulUploads Int     @default(0) @map("successful_uploads")
  failedUploads    Int      @default(0) @map("failed_uploads")
  
  // Session data (JSON)
  fileData         String?  @map("file_data") // JSON array of file metadata
  errors           String?  // JSON array of error messages
  
  // Status
  status           String   @default("in_progress") // 'in_progress', 'completed', 'failed'
  
  // Timestamps
  startedAt        DateTime @default(now()) @map("started_at")
  completedAt      DateTime? @map("completed_at")
  
  @@index([sessionId])
  @@index([status])
  @@index([startedAt])
  @@map("evidence_upload_sessions")
}
```

---

🔍 **FIND:** The EvidenceRequirement model (around line 800)
```prisma
model EvidenceRequirement {
  id                  Int      @id @default(autoincrement())
  controlId           Int      @map("control_id")
  control             Control  @relation(fields: [controlId], references: [id], onDelete: Cascade)
  evidenceType        String   @map("evidence_type")
  name                String
  description         String
  rationale           String?

  frequency           String?
  freshnessThreshold  Int?     @map("freshness_threshold")

  policyId            Int?     @map("policy_id")
  policy              PolicyDocument? @relation(fields: [policyId], references: [id], onDelete: SetNull)
  procedureId         Int?     @map("procedure_id")
  procedure           ProcedureDocument? @relation(fields: [procedureId], references: [id], onDelete: SetNull)

  uploadedEvidence    ControlEvidence[]

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@index([controlId])
  @@index([evidenceType])
  @@map("evidence_requirements")
}
```

✏️ **REPLACE WITH:**
```prisma
model EvidenceRequirement {
  id                  Int      @id @default(autoincrement())
  controlId           Int      @map("control_id")
  control             Control  @relation(fields: [controlId], references: [id], onDelete: Cascade)
  evidenceType        String   @map("evidence_type")
  name                String
  description         String
  rationale           String?

  frequency           String?
  freshnessThreshold  Int?     @map("freshness_threshold")

  policyId            Int?     @map("policy_id")
  policy              PolicyDocument? @relation(fields: [policyId], references: [id], onDelete: SetNull)
  procedureId         Int?     @map("procedure_id")
  procedure           ProcedureDocument? @relation(fields: [procedureId], references: [id], onDelete: SetNull)

  uploadedEvidence    ControlEvidence[]
  fulfillments        EvidenceControlMapping[] // NEW: Track which evidence satisfies this requirement

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@index([controlId])
  @@index([evidenceType])
  @@map("evidence_requirements")
}
```

---

### Step 1.2: Generate and Run Migration

Run these commands in the server directory:

```bash
# Generate Prisma migration
npx prisma migrate dev --name add_multi_control_evidence_mapping

# Generate Prisma Client
npx prisma generate
```

---

### Step 1.3: Create Migration Script for Existing Evidence

📁 **NEW FILE:** `server/src/scripts/migrate-existing-evidence.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateExistingEvidence() {
  console.log('🔄 Starting evidence migration...\n');

  try {
    // Get all existing evidence with controlId
    const existingEvidence = await prisma.evidence.findMany({
      where: {
        controlId: { not: null },
      },
      include: {
        control: true,
      },
    });

    console.log(`📊 Found ${existingEvidence.length} evidence records to migrate\n`);

    let successCount = 0;
    let skipCount = 0;

    for (const evidence of existingEvidence) {
      if (!evidence.controlId) {
        skipCount++;
        continue;
      }

      // Check if mapping already exists
      const existingMapping = await prisma.evidenceControlMapping.findUnique({
        where: {
          evidenceId_controlId: {
            evidenceId: evidence.id,
            controlId: evidence.controlId,
          },
        },
      });

      if (existingMapping) {
        console.log(`  ⏭️  Skipping ${evidence.originalName} - mapping already exists`);
        skipCount++;
        continue;
      }

      // Create new mapping
      await prisma.evidenceControlMapping.create({
        data: {
          evidenceId: evidence.id,
          controlId: evidence.controlId,
          relationship: 'primary',
          notes: 'Migrated from legacy evidence structure',
          mappedBy: evidence.uploadedBy || 'system',
          mappedAt: evidence.uploadedDate,
          isVerified: true,
          verifiedBy: 'system',
          verifiedAt: evidence.uploadedDate,
        },
      });

      console.log(`  ✅ Migrated: ${evidence.originalName} → ${evidence.control?.controlId}`);
      successCount++;
    }

    console.log('\n📈 Migration Summary:');
    console.log(`  ✅ Successfully migrated: ${successCount}`);
    console.log(`  ⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`  📊 Total processed: ${existingEvidence.length}\n`);

    console.log('✅ Evidence migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateExistingEvidence()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run the migration:
```bash
npx tsx src/scripts/migrate-existing-evidence.ts
```

---

## 🎯 PHASE 2: Backend API - Types & Services

### Step 2.1: Create Evidence Types

📁 **NEW FILE:** `server/src/types/evidence.types.ts`

```typescript
// Evidence relationship types
export type EvidenceRelationship = 'primary' | 'supporting' | 'referenced' | 'supplementary';

// Evidence types
export type EvidenceType = 'policy' | 'procedure' | 'execution' | 'screenshot' | 'log' | 'report' | 'configuration' | 'general';

// Evidence status
export type EvidenceStatus = 'uploaded' | 'under_review' | 'approved' | 'rejected' | 'expired';

// Freshness status for execution evidence
export type FreshnessStatus = 'fresh' | 'aging' | 'stale' | 'critical';

// Evidence with control mappings
export interface EvidenceWithMappings {
  id: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  evidenceType: EvidenceType;
  description?: string;
  uploadedBy?: string;
  uploadedDate: Date;
  version: number;
  tags?: string[];
  status: EvidenceStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Control mappings
  controlMappings: {
    id: number;
    controlId: number;
    relationship: EvidenceRelationship;
    notes?: string;
    isVerified: boolean;
    verifiedBy?: string;
    verifiedAt?: Date;
    control: {
      id: number;
      controlId: string;
      family: string;
      title: string;
      priority: string;
    };
  }[];
  
  // Manual review evidence
  manualReviewLinks: {
    id: number;
    reviewId: number;
    review: {
      id: number;
      settingId: number;
      policyId?: number;
      controlId?: number;
    };
  }[];
}

// Evidence filters
export interface EvidenceFilters {
  controlId?: number;
  family?: string;
  evidenceType?: EvidenceType;
  status?: EvidenceStatus;
  fileType?: string;
  tags?: string[];
  startDate?: Date;
  endDate?: Date;
  isArchived?: boolean;
  searchTerm?: string;
  uploadedBy?: string;
  hasMultipleControls?: boolean;
}

// Evidence statistics
export interface EvidenceStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<EvidenceType, number>;
  byStatus: Record<EvidenceStatus, number>;
  byFamily: Record<string, number>;
  controlsWithEvidence: number;
  controlsWithoutEvidence: number;
  averageControlsPerEvidence: number;
  multiControlEvidenceCount: number;
  recentUploads: number; // Last 30 days
}

// Evidence coverage by control
export interface EvidenceCoverage {
  controlId: number;
  control: {
    id: number;
    controlId: string;
    family: string;
    title: string;
    priority: string;
  };
  totalRequirements: number;
  fulfilledRequirements: number;
  partialRequirements: number;
  missingRequirements: number;
  coveragePercentage: number;
  evidenceCount: number;
  lastUpdated: Date;
}

// Control suggestion for evidence
export interface ControlSuggestion {
  controlId: string;
  control: {
    id: number;
    controlId: string;
    family: string;
    title: string;
    priority: string;
  };
  suggestedRelationship: EvidenceRelationship;
  confidenceScore: number; // 0-1
  reason: string;
  keywords: string[];
}

// Bulk upload result
export interface BulkUploadResult {
  sessionId: string;
  totalFiles: number;
  successful: Array<{
    evidenceId: number;
    originalName: string;
    controlMappings: number;
  }>;
  failed: Array<{
    originalName: string;
    error: string;
  }>;
  summary: {
    successCount: number;
    failCount: number;
    totalMappingsCreated: number;
  };
}

// Evidence template
export interface EvidenceTemplate {
  id: number;
  name: string;
  description?: string;
  evidenceType: EvidenceType;
  suggestedControls: string[];
  keywords: string[];
  expectedFileTypes?: string[];
  defaultRelationship: EvidenceRelationship;
  timesUsed: number;
  lastUsed?: Date;
}

// Manual review evidence summary
export interface ManualReviewEvidenceSummary {
  totalReviews: number;
  reviewsWithEvidence: number;
  evidenceFiles: Array<{
    id: number;
    originalName: string;
    fileType: string;
    uploadedDate: Date;
    reviews: Array<{
      id: number;
      controlId?: number;
      control?: {
        controlId: string;
        title: string;
      };
      settingId: number;
      setting: {
        displayName: string;
        settingPath: string;
      };
      manualComplianceStatus?: string;
    }>;
  }>;
}
```

---

### Step 2.2: Create Evidence Service

📁 **NEW FILE:** `server/src/services/evidence.service.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import {
  EvidenceWithMappings,
  EvidenceFilters,
  EvidenceStats,
  EvidenceCoverage,
  ControlSuggestion,
  BulkUploadResult,
  ManualReviewEvidenceSummary,
  EvidenceType,
  EvidenceRelationship,
} from '../types/evidence.types';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

class EvidenceService {
  /**
   * Get all evidence with optional filters
   */
  async getEvidence(filters: EvidenceFilters = {}): Promise<EvidenceWithMappings[]> {
    const where: any = {
      isArchived: filters.isArchived ?? false,
    };

    // Evidence type filter
    if (filters.evidenceType) {
      where.evidenceType = filters.evidenceType;
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // File type filter
    if (filters.fileType) {
      where.fileType = { contains: filters.fileType };
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.uploadedDate = {};
      if (filters.startDate) {
        where.uploadedDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.uploadedDate.lte = filters.endDate;
      }
    }

    // Uploaded by filter
    if (filters.uploadedBy) {
      where.uploadedBy = filters.uploadedBy;
    }

    // Search term filter (filename or description)
    if (filters.searchTerm) {
      where.OR = [
        { originalName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { description: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }

    // Get evidence with mappings
    let evidence = await prisma.evidence.findMany({
      where,
      include: {
        controlMappings: {
          include: {
            control: {
              select: {
                id: true,
                controlId: true,
                family: true,
                title: true,
                priority: true,
              },
            },
          },
        },
        manualReviewLinks: {
          include: {
            review: {
              select: {
                id: true,
                settingId: true,
                policyId: true,
                controlId: true,
              },
            },
          },
        },
      },
      orderBy: { uploadedDate: 'desc' },
    });

    // Apply post-query filters

    // Control ID filter
    if (filters.controlId) {
      evidence = evidence.filter((e) =>
        e.controlMappings.some((m) => m.controlId === filters.controlId)
      );
    }

    // Family filter
    if (filters.family) {
      evidence = evidence.filter((e) =>
        e.controlMappings.some((m) => m.control.family === filters.family)
      );
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      evidence = evidence.filter((e) => {
        const evidenceTags = e.tags ? JSON.parse(e.tags) : [];
        return filters.tags!.some((tag) => evidenceTags.includes(tag));
      });
    }

    // Has multiple controls filter
    if (filters.hasMultipleControls !== undefined) {
      evidence = evidence.filter((e) =>
        filters.hasMultipleControls
          ? e.controlMappings.length > 1
          : e.controlMappings.length <= 1
      );
    }

    // Parse tags for each evidence
    return evidence.map((e) => ({
      ...e,
      tags: e.tags ? JSON.parse(e.tags) : [],
    })) as any;
  }

  /**
   * Get evidence by ID
   */
  async getEvidenceById(id: number): Promise<EvidenceWithMappings | null> {
    const evidence = await prisma.evidence.findUnique({
      where: { id },
      include: {
        controlMappings: {
          include: {
            control: {
              select: {
                id: true,
                controlId: true,
                family: true,
                title: true,
                priority: true,
              },
            },
          },
        },
        manualReviewLinks: {
          include: {
            review: {
              select: {
                id: true,
                settingId: true,
                policyId: true,
                controlId: true,
              },
            },
          },
        },
      },
    });

    if (!evidence) return null;

    return {
      ...evidence,
      tags: evidence.tags ? JSON.parse(evidence.tags) : [],
    } as any;
  }

  /**
   * Get evidence for a specific control
   */
  async getEvidenceForControl(controlId: number): Promise<EvidenceWithMappings[]> {
    return this.getEvidence({ controlId });
  }

  /**
   * Get evidence statistics
   */
  async getEvidenceStats(): Promise<EvidenceStats> {
    const [
      totalFiles,
      allEvidence,
      totalControls,
      controlsWithEvidence,
      recentUploads,
    ] = await Promise.all([
      prisma.evidence.count({ where: { isArchived: false } }),
      prisma.evidence.findMany({
        where: { isArchived: false },
        select: {
          fileSize: true,
          evidenceType: true,
          status: true,
          uploadedDate: true,
          controlMappings: {
            select: {
              control: {
                select: { family: true },
              },
            },
          },
        },
      }),
      prisma.control.count(),
      prisma.control.count({
        where: {
          evidenceMappings: {
            some: {},
          },
        },
      }),
      prisma.evidence.count({
        where: {
          uploadedDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
          isArchived: false,
        },
      }),
    ]);

    // Calculate statistics
    const totalSize = allEvidence.reduce((sum, e) => sum + e.fileSize, 0);

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byFamily: Record<string, number> = {};
    let totalMappings = 0;
    let multiControlCount = 0;

    allEvidence.forEach((e) => {
      // By type
      byType[e.evidenceType] = (byType[e.evidenceType] || 0) + 1;

      // By status
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;

      // By family
      e.controlMappings.forEach((m) => {
        const family = m.control.family;
        byFamily[family] = (byFamily[family] || 0) + 1;
      });

      // Multi-control evidence
      if (e.controlMappings.length > 1) {
        multiControlCount++;
      }

      totalMappings += e.controlMappings.length;
    });

    return {
      totalFiles,
      totalSize,
      byType: byType as any,
      byStatus: byStatus as any,
      byFamily,
      controlsWithEvidence,
      controlsWithoutEvidence: totalControls - controlsWithEvidence,
      averageControlsPerEvidence: totalFiles > 0 ? totalMappings / totalFiles : 0,
      multiControlEvidenceCount: multiControlCount,
      recentUploads,
    };
  }

  /**
   * Get evidence coverage for all controls
   */
  async getEvidenceCoverage(family?: string): Promise<EvidenceCoverage[]> {
    const where: any = {};
    if (family) {
      where.family = family;
    }

    const controls = await prisma.control.findMany({
      where,
      include: {
        evidenceMappings: {
          where: {
            evidence: {
              isArchived: false,
            },
          },
        },
        evidenceRequirements: true,
      },
    });

    return controls.map((control) => {
      const totalRequirements = control.evidenceRequirements.length;
      const evidenceCount = control.evidenceMappings.length;

      // For now, simple calculation - can be enhanced with requirement fulfillment tracking
      const coveragePercentage =
        totalRequirements > 0
          ? Math.round((evidenceCount / totalRequirements) * 100)
          : evidenceCount > 0
          ? 100
          : 0;

      return {
        controlId: control.id,
        control: {
          id: control.id,
          controlId: control.controlId,
          family: control.family,
          title: control.title,
          priority: control.priority,
        },
        totalRequirements,
        fulfilledRequirements: Math.min(evidenceCount, totalRequirements),
        partialRequirements: 0, // TODO: Implement partial fulfillment tracking
        missingRequirements: Math.max(0, totalRequirements - evidenceCount),
        coveragePercentage,
        evidenceCount,
        lastUpdated: new Date(),
      };
    });
  }

  /**
   * Suggest controls for evidence based on filename and type
   */
  async suggestControlsForEvidence(
    filename: string,
    evidenceType?: EvidenceType
  ): Promise<ControlSuggestion[]> {
    // Extract keywords from filename
    const keywords = this.extractKeywords(filename);

    // Check templates first
    const templates = await prisma.evidenceTemplate.findMany({
      where: {
        isActive: true,
        ...(evidenceType && { evidenceType }),
      },
    });

    const suggestions: ControlSuggestion[] = [];
    const processedControlIds = new Set<string>();

    // Match against templates
    for (const template of templates) {
      const templateKeywords = JSON.parse(template.keywords);
      const matchScore = this.calculateKeywordMatchScore(keywords, templateKeywords);

      if (matchScore > 0.3) {
        // 30% threshold
        const suggestedControlIds = JSON.parse(template.suggestedControls);

        for (const controlId of suggestedControlIds) {
          if (processedControlIds.has(controlId)) continue;

          const control = await prisma.control.findUnique({
            where: { controlId },
            select: {
              id: true,
              controlId: true,
              family: true,
              title: true,
              priority: true,
            },
          });

          if (control) {
            suggestions.push({
              controlId: control.controlId,
              control,
              suggestedRelationship: template.defaultRelationship as EvidenceRelationship,
              confidenceScore: matchScore,
              reason: `Matches template: ${template.name}`,
              keywords: templateKeywords,
            });
            processedControlIds.add(controlId);
          }
        }
      }
    }

    // Fallback: Match against control titles and requirements
    if (suggestions.length === 0) {
      const controls = await prisma.control.findMany({
        include: {
          evidenceRequirements: true,
        },
      });

      for (const control of controls) {
        const titleKeywords = this.extractKeywords(control.title);
        const requirementKeywords = control.evidenceRequirements.flatMap((req) =>
          this.extractKeywords(req.name + ' ' + req.description)
        );

        const allControlKeywords = [...titleKeywords, ...requirementKeywords];
        const matchScore = this.calculateKeywordMatchScore(keywords, allControlKeywords);

        if (matchScore > 0.2) {
          // Lower threshold for direct matching
          suggestions.push({
            controlId: control.controlId,
            control: {
              id: control.id,
              controlId: control.controlId,
              family: control.family,
              title: control.title,
              priority: control.priority,
            },
            suggestedRelationship: 'supporting',
            confidenceScore: matchScore,
            reason: 'Keyword match with control requirements',
            keywords: allControlKeywords.slice(0, 5),
          });
        }
      }
    }

    // Sort by confidence score
    return suggestions
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 20); // Return top 20 suggestions
  }

  /**
   * Upload evidence with optional control mappings
   */
  async uploadEvidence(data: {
    fileName: string;
    originalName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    evidenceType: EvidenceType;
    description?: string;
    uploadedBy?: string;
    tags?: string[];
    controlMappings?: Array<{
      controlId: number;
      relationship: EvidenceRelationship;
      notes?: string;
    }>;
  }): Promise<EvidenceWithMappings> {
    // Create evidence record
    const evidence = await prisma.evidence.create({
      data: {
        fileName: data.fileName,
        originalName: data.originalName,
        filePath: data.filePath,
        fileType: data.fileType,
        fileSize: data.fileSize,
        evidenceType: data.evidenceType,
        description: data.description,
        uploadedBy: data.uploadedBy,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        status: 'uploaded',
      },
    });

    // Create control mappings if provided
    if (data.controlMappings && data.controlMappings.length > 0) {
      await prisma.evidenceControlMapping.createMany({
        data: data.controlMappings.map((mapping) => ({
          evidenceId: evidence.id,
          controlId: mapping.controlId,
          relationship: mapping.relationship,
          notes: mapping.notes,
          mappedBy: data.uploadedBy || 'user',
          mappedAt: new Date(),
        })),
      });
    }

    return this.getEvidenceById(evidence.id) as Promise<EvidenceWithMappings>;
  }

  /**
   * Update evidence metadata
   */
  async updateEvidence(
    id: number,
    data: {
      description?: string;
      tags?: string[];
      evidenceType?: EvidenceType;
      status?: string;
      reviewNotes?: string;
    }
  ): Promise<EvidenceWithMappings> {
    await prisma.evidence.update({
      where: { id },
      data: {
        ...(data.description !== undefined && { description: data.description }),
        ...(data.tags !== undefined && { tags: JSON.stringify(data.tags) }),
        ...(data.evidenceType !== undefined && { evidenceType: data.evidenceType }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.reviewNotes !== undefined && { reviewNotes: data.reviewNotes }),
      },
    });

    return this.getEvidenceById(id) as Promise<EvidenceWithMappings>;
  }

  /**
   * Add control mapping to evidence
   */
  async addControlMapping(data: {
    evidenceId: number;
    controlId: number;
    relationship: EvidenceRelationship;
    notes?: string;
    mappedBy?: string;
    requirementId?: number;
  }): Promise<void> {
    await prisma.evidenceControlMapping.create({
      data: {
        evidenceId: data.evidenceId,
        controlId: data.controlId,
        relationship: data.relationship,
        notes: data.notes,
        mappedBy: data.mappedBy || 'user',
        mappedAt: new Date(),
        requirementId: data.requirementId,
      },
    });
  }

  /**
   * Remove control mapping from evidence
   */
  async removeControlMapping(evidenceId: number, controlId: number): Promise<void> {
    await prisma.evidenceControlMapping.delete({
      where: {
        evidenceId_controlId: {
          evidenceId,
          controlId,
        },
      },
    });
  }

  /**
   * Update control mapping
   */
  async updateControlMapping(
    mappingId: number,
    data: {
      relationship?: EvidenceRelationship;
      notes?: string;
      isVerified?: boolean;
      verifiedBy?: string;
    }
  ): Promise<void> {
    await prisma.evidenceControlMapping.update({
      where: { id: mappingId },
      data: {
        ...(data.relationship !== undefined && { relationship: data.relationship }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isVerified !== undefined && { isVerified: data.isVerified }),
        ...(data.verifiedBy !== undefined && { verifiedBy: data.verifiedBy }),
        ...(data.isVerified && { verifiedAt: new Date() }),
      },
    });
  }

  /**
   * Verify control mapping
   */
  async verifyControlMapping(mappingId: number, verifiedBy: string): Promise<void> {
    await prisma.evidenceControlMapping.update({
      where: { id: mappingId },
      data: {
        isVerified: true,
        verifiedBy,
        verifiedAt: new Date(),
      },
    });
  }

  /**
   * Delete evidence
   */
  async deleteEvidence(id: number): Promise<void> {
    // Get evidence to delete file
    const evidence = await prisma.evidence.findUnique({
      where: { id },
    });

    if (!evidence) {
      throw new Error('Evidence not found');
    }

    // Delete file from filesystem
    const fullPath = path.join(process.cwd(), evidence.filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      console.error('Failed to delete file:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database (cascades to mappings)
    await prisma.evidence.delete({
      where: { id },
    });
  }

  /**
   * Archive evidence
   */
  async archiveEvidence(
    id: number,
    archivedBy: string,
    reason?: string
  ): Promise<void> {
    await prisma.evidence.update({
      where: { id },
      data: {
        isArchived: true,
        archivedBy,
        archivedAt: new Date(),
        archivedReason: reason,
      },
    });
  }

  /**
   * Unarchive evidence
   */
  async unarchiveEvidence(id: number): Promise<void> {
    await prisma.evidence.update({
      where: { id },
      data: {
        isArchived: false,
        archivedBy: null,
        archivedAt: null,
        archivedReason: null,
      },
    });
  }

  /**
   * Get manual review evidence summary
   */
  async getManualReviewEvidenceSummary(): Promise<ManualReviewEvidenceSummary> {
    const [totalReviews, evidenceWithReviews] = await Promise.all([
      prisma.manualSettingReview.count(),
      prisma.evidence.findMany({
        where: {
          manualReviewLinks: {
            some: {},
          },
          isArchived: false,
        },
        include: {
          manualReviewLinks: {
            include: {
              review: {
                include: {
                  control: {
                    select: {
                      controlId: true,
                      title: true,
                    },
                  },
                  setting: {
                    select: {
                      displayName: true,
                      settingPath: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      totalReviews,
      reviewsWithEvidence: evidenceWithReviews.length,
      evidenceFiles: evidenceWithReviews.map((e) => ({
        id: e.id,
        originalName: e.originalName,
        fileType: e.fileType,
        uploadedDate: e.uploadedDate,
        reviews: e.manualReviewLinks.map((link) => ({
          id: link.review.id,
          controlId: link.review.controlId,
          control: link.review.control
            ? {
                controlId: link.review.control.controlId,
                title: link.review.control.title,
              }
            : undefined,
          settingId: link.review.settingId,
          setting: {
            displayName: link.review.setting.displayName,
            settingPath: link.review.setting.settingPath,
          },
          manualComplianceStatus: link.review.manualComplianceStatus,
        })),
      })),
    };
  }

  // ======== Helper Methods ========

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Remove file extensions and special characters
    const cleaned = text
      .toLowerCase()
      .replace(/\.(pdf|docx|xlsx|png|jpg|jpeg|txt|csv)$/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/[^a-z0-9\s]/g, '');

    // Split into words and filter out common words
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'been',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'should',
      'could',
      'may',
      'might',
      'must',
      'can',
      '2024',
      '2025',
      'file',
      'document',
      'report',
    ]);

    return cleaned
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .filter((word, index, self) => self.indexOf(word) === index); // Unique words
  }

  /**
   * Calculate keyword match score between two keyword arrays
   */
  private calculateKeywordMatchScore(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;

    const set1 = new Set(keywords1.map((k) => k.toLowerCase()));
    const set2 = new Set(keywords2.map((k) => k.toLowerCase()));

    let matches = 0;
    for (const keyword of set1) {
      if (set2.has(keyword)) {
        matches++;
      }
    }

    // Return Jaccard similarity
    const union = new Set([...set1, ...set2]);
    return matches / union.size;
  }
}

export const evidenceService = new EvidenceService();
```
