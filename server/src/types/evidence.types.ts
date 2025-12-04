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
