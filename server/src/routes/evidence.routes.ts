import { Router } from 'express';
import { evidenceService } from '../services/evidence.service';
import { EvidenceFilters, EvidenceType, EvidenceRelationship } from '../types/evidence.types';
import { prisma } from '@/config/database';
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
 * GET /api/evidence/requirements/:controlId
 * Get evidence requirements for a specific control
 */
router.get('/requirements/:controlId', async (req, res) => {
  try {
    const controlIdString = req.params.controlId; // e.g., "03.01.01"

    // First, find the control by its controlId string to get the database ID
    const control = await prisma.control.findUnique({
      where: {
        controlId: controlIdString,
      },
      select: {
        id: true,
      },
    });

    if (!control) {
      return res.status(404).json({
        success: false,
        error: 'Control not found',
      });
    }

    // Now query evidence requirements using the database ID
    const requirements = await prisma.evidenceRequirement.findMany({
      where: {
        controlId: control.id,
      },
      include: {
        policy: {
          select: {
            name: true,
            fileName: true,
          },
        },
        procedure: {
          select: {
            name: true,
            fileName: true,
          },
        },
        uploadedEvidence: {
          select: {
            id: true,
            fileName: true,
            uploadedAt: true,
            executionDate: true,
          },
          orderBy: {
            uploadedAt: 'desc',
          },
        },
      },
    });

    res.json(requirements);
  } catch (error) {
    console.error('Error fetching evidence requirements:', error);
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
