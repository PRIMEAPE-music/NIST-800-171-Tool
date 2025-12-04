## 🎯 PHASE 3: Backend API Routes

### Step 3.1: Update Evidence Routes

📁 **File:** `server/src/routes/evidence.routes.ts`

🔄 **COMPLETE REWRITE:**

```typescript
import { Router } from 'express';
import { evidenceService } from '../services/evidence.service';
import { EvidenceFilters, EvidenceType, EvidenceRelationship } from '../types/evidence.types';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'evidence');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const sanitizedName = file.originalname
      .replace(ext, '')
      .replace(/[^a-z0-9]/gi, '_')
      .substring(0, 50);
    cb(null, `${sanitizedName}_${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'text/plain',
      'text/csv',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

// ============================================================================
// GET ENDPOINTS
// ============================================================================

/**
 * GET /api/evidence
 * Get all evidence with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const filters: EvidenceFilters = {
      controlId: req.query.controlId ? parseInt(req.query.controlId as string) : undefined,
      family: req.query.family as string,
      evidenceType: req.query.evidenceType as EvidenceType,
      status: req.query.status as any,
      fileType: req.query.fileType as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      isArchived: req.query.isArchived === 'true',
      searchTerm: req.query.searchTerm as string,
      uploadedBy: req.query.uploadedBy as string,
      hasMultipleControls: req.query.hasMultipleControls === 'true' ? true : req.query.hasMultipleControls === 'false' ? false : undefined,
    };

    const evidence = await evidenceService.getEvidence(filters);

    res.json({
      success: true,
      count: evidence.length,
      evidence,
    });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/evidence/stats
 * Get evidence statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await evidenceService.getEvidenceStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching evidence stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/evidence/coverage
 * Get evidence coverage for all controls
 */
router.get('/coverage', async (req, res) => {
  try {
    const family = req.query.family as string | undefined;
    const coverage = await evidenceService.getEvidenceCoverage(family);

    res.json({
      success: true,
      count: coverage.length,
      coverage,
    });
  } catch (error) {
    console.error('Error fetching evidence coverage:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/evidence/gaps
 * Get evidence gaps (controls without evidence)
 */
router.get('/gaps', async (req, res) => {
  try {
    const coverage = await evidenceService.getEvidenceCoverage();
    const gaps = coverage.filter((c) => c.evidenceCount === 0);

    res.json({
      success: true,
      count: gaps.length,
      gaps,
    });
  } catch (error) {
    console.error('Error fetching evidence gaps:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/evidence/manual-reviews
 * Get manual review evidence summary
 */
router.get('/manual-reviews', async (req, res) => {
  try {
    const summary = await evidenceService.getManualReviewEvidenceSummary();

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Error fetching manual review evidence:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/evidence/suggest-controls
 * Suggest controls for evidence based on filename
 */
router.get('/suggest-controls', async (req, res) => {
  try {
    const filename = req.query.filename as string;
    const evidenceType = req.query.evidenceType as EvidenceType | undefined;

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required',
      });
    }

    const suggestions = await evidenceService.suggestControlsForEvidence(filename, evidenceType);

    res.json({
      success: true,
      count: suggestions.length,
      suggestions,
    });
  } catch (error) {
    console.error('Error suggesting controls:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/evidence/:id
 * Get evidence by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const evidence = await evidenceService.getEvidenceById(id);

    if (!evidence) {
      return res.status(404).json({
        success: false,
        error: 'Evidence not found',
      });
    }

    res.json({
      success: true,
      evidence,
    });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/evidence/:id/download
 * Download evidence file
 */
router.get('/:id/download', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const evidence = await evidenceService.getEvidenceById(id);

    if (!evidence) {
      return res.status(404).json({
        success: false,
        error: 'Evidence not found',
      });
    }

    const filePath = path.join(process.cwd(), evidence.filePath);
    res.download(filePath, evidence.originalName);
  } catch (error) {
    console.error('Error downloading evidence:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// POST ENDPOINTS
// ============================================================================

/**
 * POST /api/evidence/upload
 * Upload single evidence file
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const {
      evidenceType = 'general',
      description,
      uploadedBy = 'user',
      tags = [],
      controlMappings = [],
    } = req.body;

    // Parse JSON fields
    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    const parsedMappings = typeof controlMappings === 'string' ? JSON.parse(controlMappings) : controlMappings;

    const evidence = await evidenceService.uploadEvidence({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: path.join('uploads', 'evidence', req.file.filename),
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      evidenceType: evidenceType as EvidenceType,
      description,
      uploadedBy,
      tags: parsedTags,
      controlMappings: parsedMappings,
    });

    res.status(201).json({
      success: true,
      message: 'Evidence uploaded successfully',
      evidence,
    });
  } catch (error) {
    console.error('Error uploading evidence:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/evidence/bulk-upload
 * Upload multiple evidence files
 */
router.post('/bulk-upload', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
    }

    const {
      evidenceType = 'general',
      uploadedBy = 'user',
      defaultControlMappings = [],
    } = req.body;

    const parsedDefaultMappings = typeof defaultControlMappings === 'string' 
      ? JSON.parse(defaultControlMappings) 
      : defaultControlMappings;

    const sessionId = uuidv4();
    const results = {
      sessionId,
      totalFiles: req.files.length,
      successful: [] as any[],
      failed: [] as any[],
      summary: {
        successCount: 0,
        failCount: 0,
        totalMappingsCreated: 0,
      },
    };

    for (const file of req.files) {
      try {
        const evidence = await evidenceService.uploadEvidence({
          fileName: file.filename,
          originalName: file.originalname,
          filePath: path.join('uploads', 'evidence', file.filename),
          fileType: file.mimetype,
          fileSize: file.size,
          evidenceType: evidenceType as EvidenceType,
          uploadedBy,
          controlMappings: parsedDefaultMappings,
        });

        results.successful.push({
          evidenceId: evidence.id,
          originalName: file.originalname,
          controlMappings: evidence.controlMappings.length,
        });

        results.summary.successCount++;
        results.summary.totalMappingsCreated += evidence.controlMappings.length;
      } catch (error) {
        results.failed.push({
          originalName: file.originalname,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        results.summary.failCount++;
      }
    }

    res.status(201).json({
      success: true,
      message: `Bulk upload completed: ${results.summary.successCount} succeeded, ${results.summary.failCount} failed`,
      results,
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/evidence/:id/mappings
 * Add control mapping to evidence
 */
router.post('/:id/mappings', async (req, res) => {
  try {
    const evidenceId = parseInt(req.params.id);
    const { controlId, relationship, notes, mappedBy, requirementId } = req.body;

    if (!controlId || !relationship) {
      return res.status(400).json({
        success: false,
        error: 'controlId and relationship are required',
      });
    }

    await evidenceService.addControlMapping({
      evidenceId,
      controlId,
      relationship: relationship as EvidenceRelationship,
      notes,
      mappedBy,
      requirementId,
    });

    // Get updated evidence
    const evidence = await evidenceService.getEvidenceById(evidenceId);

    res.json({
      success: true,
      message: 'Control mapping added successfully',
      evidence,
    });
  } catch (error) {
    console.error('Error adding control mapping:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// PUT/PATCH ENDPOINTS
// ============================================================================

/**
 * PATCH /api/evidence/:id
 * Update evidence metadata
 */
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { description, tags, evidenceType, status, reviewNotes } = req.body;

    const evidence = await evidenceService.updateEvidence(id, {
      description,
      tags,
      evidenceType,
      status,
      reviewNotes,
    });

    res.json({
      success: true,
      message: 'Evidence updated successfully',
      evidence,
    });
  } catch (error) {
    console.error('Error updating evidence:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/evidence/:id/mappings/:mappingId
 * Update control mapping
 */
router.patch('/:id/mappings/:mappingId', async (req, res) => {
  try {
    const evidenceId = parseInt(req.params.id);
    const mappingId = parseInt(req.params.mappingId);
    const { relationship, notes, isVerified, verifiedBy } = req.body;

    await evidenceService.updateControlMapping(mappingId, {
      relationship,
      notes,
      isVerified,
      verifiedBy,
    });

    // Get updated evidence
    const evidence = await evidenceService.getEvidenceById(evidenceId);

    res.json({
      success: true,
      message: 'Control mapping updated successfully',
      evidence,
    });
  } catch (error) {
    console.error('Error updating control mapping:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/evidence/:id/mappings/:mappingId/verify
 * Verify control mapping
 */
router.post('/:id/mappings/:mappingId/verify', async (req, res) => {
  try {
    const evidenceId = parseInt(req.params.id);
    const mappingId = parseInt(req.params.mappingId);
    const { verifiedBy = 'user' } = req.body;

    await evidenceService.verifyControlMapping(mappingId, verifiedBy);

    // Get updated evidence
    const evidence = await evidenceService.getEvidenceById(evidenceId);

    res.json({
      success: true,
      message: 'Control mapping verified successfully',
      evidence,
    });
  } catch (error) {
    console.error('Error verifying control mapping:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/evidence/:id/archive
 * Archive evidence
 */
router.post('/:id/archive', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { archivedBy = 'user', reason } = req.body;

    await evidenceService.archiveEvidence(id, archivedBy, reason);

    res.json({
      success: true,
      message: 'Evidence archived successfully',
    });
  } catch (error) {
    console.error('Error archiving evidence:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/evidence/:id/unarchive
 * Unarchive evidence
 */
router.post('/:id/unarchive', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await evidenceService.unarchiveEvidence(id);

    res.json({
      success: true,
      message: 'Evidence unarchived successfully',
    });
  } catch (error) {
    console.error('Error unarchiving evidence:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// DELETE ENDPOINTS
// ============================================================================

/**
 * DELETE /api/evidence/:id
 * Delete evidence
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await evidenceService.deleteEvidence(id);

    res.json({
      success: true,
      message: 'Evidence deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/evidence/:id/mappings/:mappingId
 * Remove control mapping from evidence
 */
router.delete('/:id/mappings/:mappingId', async (req, res) => {
  try {
    const evidenceId = parseInt(req.params.id);
    const mappingId = parseInt(req.params.mappingId);

    // Get the mapping to find controlId
    const evidence = await evidenceService.getEvidenceById(evidenceId);
    const mapping = evidence?.controlMappings.find((m) => m.id === mappingId);

    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: 'Mapping not found',
      });
    }

    await evidenceService.removeControlMapping(evidenceId, mapping.controlId);

    // Get updated evidence
    const updatedEvidence = await evidenceService.getEvidenceById(evidenceId);

    res.json({
      success: true,
      message: 'Control mapping removed successfully',
      evidence: updatedEvidence,
    });
  } catch (error) {
    console.error('Error removing control mapping:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
```

---

## 🎯 PHASE 4: Frontend Types & Services

### Step 4.1: Update Frontend Evidence Types

📁 **File:** `client/src/types/evidence.types.ts`

🔄 **COMPLETE REWRITE:**

```typescript
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
```

---

### Step 4.2: Update Evidence Service

📁 **File:** `client/src/services/evidenceService.ts`

🔄 **COMPLETE REWRITE:**

```typescript
import axios from 'axios';
import {
  Evidence,
  EvidenceFilters,
  EvidenceStats,
  EvidenceCoverage,
  ControlSuggestion,
  UploadResult,
  BulkUploadResult,
  ManualReviewEvidenceSummary,
  EvidenceType,
  EvidenceRelationship,
} from '../types/evidence.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class EvidenceService {
  /**
   * Get all evidence with optional filters
   */
  async getEvidence(filters?: EvidenceFilters): Promise<Evidence[]> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.controlId) params.append('controlId', filters.controlId.toString());
      if (filters.family) params.append('family', filters.family);
      if (filters.evidenceType) params.append('evidenceType', filters.evidenceType);
      if (filters.status) params.append('status', filters.status);
      if (filters.fileType) params.append('fileType', filters.fileType);
      if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','));
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.isArchived !== undefined) params.append('isArchived', filters.isArchived.toString());
      if (filters.searchTerm) params.append('searchTerm', filters.searchTerm);
      if (filters.uploadedBy) params.append('uploadedBy', filters.uploadedBy);
      if (filters.hasMultipleControls !== undefined) params.append('hasMultipleControls', filters.hasMultipleControls.toString());
    }

    const response = await axios.get(`${API_BASE_URL}/evidence?${params.toString()}`);
    return response.data.evidence;
  }

  /**
   * Get evidence by ID
   */
  async getEvidenceById(id: number): Promise<Evidence> {
    const response = await axios.get(`${API_BASE_URL}/evidence/${id}`);
    return response.data.evidence;
  }

  /**
   * Get evidence for a specific control
   */
  async getEvidenceForControl(controlId: number): Promise<Evidence[]> {
    return this.getEvidence({ controlId });
  }

  /**
   * Get evidence statistics
   */
  async getEvidenceStats(): Promise<EvidenceStats> {
    const response = await axios.get(`${API_BASE_URL}/evidence/stats`);
    return response.data.stats;
  }

  /**
   * Get evidence coverage
   */
  async getEvidenceCoverage(family?: string): Promise<EvidenceCoverage[]> {
    const params = family ? `?family=${family}` : '';
    const response = await axios.get(`${API_BASE_URL}/evidence/coverage${params}`);
    return response.data.coverage;
  }

  /**
   * Get evidence gaps (controls without evidence)
   */
  async getEvidenceGaps(): Promise<EvidenceCoverage[]> {
    const response = await axios.get(`${API_BASE_URL}/evidence/gaps`);
    return response.data.gaps;
  }

  /**
   * Get manual review evidence summary
   */
  async getManualReviewEvidenceSummary(): Promise<ManualReviewEvidenceSummary> {
    const response = await axios.get(`${API_BASE_URL}/evidence/manual-reviews`);
    return response.data.summary;
  }

  /**
   * Suggest controls for evidence
   */
  async suggestControlsForEvidence(
    filename: string,
    evidenceType?: EvidenceType
  ): Promise<ControlSuggestion[]> {
    const params = new URLSearchParams({ filename });
    if (evidenceType) params.append('evidenceType', evidenceType);

    const response = await axios.get(`${API_BASE_URL}/evidence/suggest-controls?${params.toString()}`);
    return response.data.suggestions;
  }

  /**
   * Upload single evidence file
   */
  async uploadEvidence(
    file: File,
    data: {
      evidenceType?: EvidenceType;
      description?: string;
      uploadedBy?: string;
      tags?: string[];
      controlMappings?: Array<{
        controlId: number;
        relationship: EvidenceRelationship;
        notes?: string;
      }>;
    },
    onProgress?: (progress: number) => void
  ): Promise<Evidence> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('evidenceType', data.evidenceType || 'general');
    if (data.description) formData.append('description', data.description);
    if (data.uploadedBy) formData.append('uploadedBy', data.uploadedBy);
    if (data.tags) formData.append('tags', JSON.stringify(data.tags));
    if (data.controlMappings) formData.append('controlMappings', JSON.stringify(data.controlMappings));

    const response = await axios.post(`${API_BASE_URL}/evidence/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return response.data.evidence;
  }

  /**
   * Upload multiple evidence files
   */
  async bulkUploadEvidence(
    files: File[],
    data: {
      evidenceType?: EvidenceType;
      uploadedBy?: string;
      defaultControlMappings?: Array<{
        controlId: number;
        relationship: EvidenceRelationship;
        notes?: string;
      }>;
    },
    onProgress?: (progress: number) => void
  ): Promise<BulkUploadResult> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    formData.append('evidenceType', data.evidenceType || 'general');
    if (data.uploadedBy) formData.append('uploadedBy', data.uploadedBy);
    if (data.defaultControlMappings) {
      formData.append('defaultControlMappings', JSON.stringify(data.defaultControlMappings));
    }

    const response = await axios.post(`${API_BASE_URL}/evidence/bulk-upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
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
  ): Promise<Evidence> {
    const response = await axios.patch(`${API_BASE_URL}/evidence/${id}`, data);
    return response.data.evidence;
  }

  /**
   * Add control mapping to evidence
   */
  async addControlMapping(
    evidenceId: number,
    data: {
      controlId: number;
      relationship: EvidenceRelationship;
      notes?: string;
      mappedBy?: string;
      requirementId?: number;
    }
  ): Promise<Evidence> {
    const response = await axios.post(`${API_BASE_URL}/evidence/${evidenceId}/mappings`, data);
    return response.data.evidence;
  }

  /**
   * Update control mapping
   */
  async updateControlMapping(
    evidenceId: number,
    mappingId: number,
    data: {
      relationship?: EvidenceRelationship;
      notes?: string;
      isVerified?: boolean;
      verifiedBy?: string;
    }
  ): Promise<Evidence> {
    const response = await axios.patch(
      `${API_BASE_URL}/evidence/${evidenceId}/mappings/${mappingId}`,
      data
    );
    return response.data.evidence;
  }

  /**
   * Remove control mapping
   */
  async removeControlMapping(evidenceId: number, mappingId: number): Promise<Evidence> {
    const response = await axios.delete(
      `${API_BASE_URL}/evidence/${evidenceId}/mappings/${mappingId}`
    );
    return response.data.evidence;
  }

  /**
   * Verify control mapping
   */
  async verifyControlMapping(
    evidenceId: number,
    mappingId: number,
    verifiedBy: string = 'user'
  ): Promise<Evidence> {
    const response = await axios.post(
      `${API_BASE_URL}/evidence/${evidenceId}/mappings/${mappingId}/verify`,
      { verifiedBy }
    );
    return response.data.evidence;
  }

  /**
   * Archive evidence
   */
  async archiveEvidence(id: number, archivedBy: string = 'user', reason?: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/evidence/${id}/archive`, { archivedBy, reason });
  }

  /**
   * Unarchive evidence
   */
  async unarchiveEvidence(id: number): Promise<void> {
    await axios.post(`${API_BASE_URL}/evidence/${id}/unarchive`);
  }

  /**
   * Delete evidence
   */
  async deleteEvidence(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/evidence/${id}`);
  }

  /**
   * Download evidence file
   */
  async downloadEvidence(id: number): Promise<void> {
    window.open(`${API_BASE_URL}/evidence/${id}/download`, '_blank');
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get file icon based on mime type
   */
  getFileIcon(mimeType: string): string {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('text')) return '📃';
    return '📎';
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    switch (status) {
      case 'uploaded':
        return 'info';
      case 'under_review':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'expired':
        return 'default';
      default:
        return 'default';
    }
  }

  /**
   * Get relationship color
   */
  getRelationshipColor(relationship: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    switch (relationship) {
      case 'primary':
        return 'primary';
      case 'supporting':
        return 'info';
      case 'referenced':
        return 'secondary';
      case 'supplementary':
        return 'default';
      default:
        return 'default';
    }
  }
}

export const evidenceService = new EvidenceService();
```

---

### Step 4.3: Update Evidence Hooks

📁 **File:** `client/src/hooks/useEvidence.ts`

🔄 **COMPLETE REWRITE:**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evidenceService } from '../services/evidenceService';
import {
  EvidenceFilters,
  EvidenceType,
  EvidenceRelationship,
} from '../types/evidence.types';

/**
 * Get all evidence with filters
 */
export function useEvidence(filters?: EvidenceFilters) {
  return useQuery({
    queryKey: ['evidence', filters],
    queryFn: () => evidenceService.getEvidence(filters),
  });
}

/**
 * Get evidence by ID
 */
export function useEvidenceById(id: number) {
  return useQuery({
    queryKey: ['evidence', id],
    queryFn: () => evidenceService.getEvidenceById(id),
    enabled: !!id,
  });
}

/**
 * Get evidence for control
 */
export function useEvidenceForControl(controlId: number) {
  return useQuery({
    queryKey: ['evidence', 'control', controlId],
    queryFn: () => evidenceService.getEvidenceForControl(controlId),
    enabled: !!controlId,
  });
}

/**
 * Get evidence statistics
 */
export function useEvidenceStats() {
  return useQuery({
    queryKey: ['evidence', 'stats'],
    queryFn: () => evidenceService.getEvidenceStats(),
  });
}

/**
 * Get evidence coverage
 */
export function useEvidenceCoverage(family?: string) {
  return useQuery({
    queryKey: ['evidence', 'coverage', family],
    queryFn: () => evidenceService.getEvidenceCoverage(family),
  });
}

/**
 * Get evidence gaps
 */
export function useEvidenceGaps() {
  return useQuery({
    queryKey: ['evidence', 'gaps'],
    queryFn: () => evidenceService.getEvidenceGaps(),
  });
}

/**
 * Get manual review evidence summary
 */
export function useManualReviewEvidence() {
  return useQuery({
    queryKey: ['evidence', 'manual-reviews'],
    queryFn: () => evidenceService.getManualReviewEvidenceSummary(),
  });
}

/**
 * Suggest controls for evidence
 */
export function useSuggestControls(filename: string, evidenceType?: EvidenceType) {
  return useQuery({
    queryKey: ['evidence', 'suggest-controls', filename, evidenceType],
    queryFn: () => evidenceService.suggestControlsForEvidence(filename, evidenceType),
    enabled: !!filename,
  });
}

/**
 * Upload evidence mutation
 */
export function useUploadEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      data,
      onProgress,
    }: {
      file: File;
      data: {
        evidenceType?: EvidenceType;
        description?: string;
        uploadedBy?: string;
        tags?: string[];
        controlMappings?: Array<{
          controlId: number;
          relationship: EvidenceRelationship;
          notes?: string;
        }>;
      };
      onProgress?: (progress: number) => void;
    }) => evidenceService.uploadEvidence(file, data, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Bulk upload evidence mutation
 */
export function useBulkUploadEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      files,
      data,
      onProgress,
    }: {
      files: File[];
      data: {
        evidenceType?: EvidenceType;
        uploadedBy?: string;
        defaultControlMappings?: Array<{
          controlId: number;
          relationship: EvidenceRelationship;
          notes?: string;
        }>;
      };
      onProgress?: (progress: number) => void;
    }) => evidenceService.bulkUploadEvidence(files, data, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Update evidence mutation
 */
export function useUpdateEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        description?: string;
        tags?: string[];
        evidenceType?: EvidenceType;
        status?: string;
        reviewNotes?: string;
      };
    }) => evidenceService.updateEvidence(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Add control mapping mutation
 */
export function useAddControlMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      evidenceId,
      data,
    }: {
      evidenceId: number;
      data: {
        controlId: number;
        relationship: EvidenceRelationship;
        notes?: string;
        mappedBy?: string;
        requirementId?: number;
      };
    }) => evidenceService.addControlMapping(evidenceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Update control mapping mutation
 */
export function useUpdateControlMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      evidenceId,
      mappingId,
      data,
    }: {
      evidenceId: number;
      mappingId: number;
      data: {
        relationship?: EvidenceRelationship;
        notes?: string;
        isVerified?: boolean;
        verifiedBy?: string;
      };
    }) => evidenceService.updateControlMapping(evidenceId, mappingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Remove control mapping mutation
 */
export function useRemoveControlMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evidenceId, mappingId }: { evidenceId: number; mappingId: number }) =>
      evidenceService.removeControlMapping(evidenceId, mappingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Verify control mapping mutation
 */
export function useVerifyControlMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      evidenceId,
      mappingId,
      verifiedBy,
    }: {
      evidenceId: number;
      mappingId: number;
      verifiedBy?: string;
    }) => evidenceService.verifyControlMapping(evidenceId, mappingId, verifiedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Delete evidence mutation
 */
export function useDeleteEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => evidenceService.deleteEvidence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Archive evidence mutation
 */
export function useArchiveEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      archivedBy,
      reason,
    }: {
      id: number;
      archivedBy?: string;
      reason?: string;
    }) => evidenceService.archiveEvidence(id, archivedBy, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Unarchive evidence mutation
 */
export function useUnarchiveEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => evidenceService.unarchiveEvidence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}
```

---

This is getting quite long. Let me continue with Phase 5 (Components) in the next message. Should I continue with the frontend components now?