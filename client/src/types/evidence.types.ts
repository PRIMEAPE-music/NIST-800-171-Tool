// Evidence relationship types
export type EvidenceRelationship = 'primary' | 'supporting' | 'referenced' | 'supplementary';

// Evidence types
export type EvidenceType = 'policy' | 'procedure' | 'execution' | 'screenshot' | 'log' | 'report' | 'configuration' | 'general';

// Evidence status
export type EvidenceStatus = 'uploaded' | 'under_review' | 'approved' | 'rejected' | 'expired';

// Control mapping interface
export interface EvidenceControlMapping {
  id: number;
  controlId: number;
  relationship: EvidenceRelationship;
  notes?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  control: {
    id: number;
    controlId: string;
    family: string;
    title: string;
    priority: string;
  };
}

// Manual review link interface
export interface ManualReviewLink {
  id: number;
  reviewId: number;
  review: {
    id: number;
    settingId: number;
    policyId?: number;
    controlId?: number;
  };
}

// Evidence interface with mappings
export interface Evidence {
  id: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  evidenceType: EvidenceType;
  description?: string;
  uploadedBy?: string;
  uploadedDate: string;
  version: number;
  tags: string[];
  status: EvidenceStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;

  // Relations
  controlMappings: EvidenceControlMapping[];
  manualReviewLinks: ManualReviewLink[];
}

// Evidence filters
export interface EvidenceFilters {
  controlId?: number;
  family?: string;
  evidenceType?: EvidenceType;
  status?: EvidenceStatus;
  fileType?: string;
  tags?: string[];
  startDate?: string;
  endDate?: string;
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
  recentUploads: number;
}

// Evidence coverage
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
  lastUpdated: string;
}

// Control suggestion
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
  confidenceScore: number;
  reason: string;
  keywords: string[];
}

// Upload result
export interface UploadResult {
  success: boolean;
  message: string;
  evidence?: Evidence;
  error?: string;
}

// Bulk upload result
export interface BulkUploadResult {
  success: boolean;
  message: string;
  results: {
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
  };
}

// Manual review evidence summary
export interface ManualReviewEvidenceSummary {
  totalReviews: number;
  reviewsWithEvidence: number;
  evidenceFiles: Array<{
    id: number;
    originalName: string;
    fileType: string;
    uploadedDate: string;
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

// Upload progress (for UI)
export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}
