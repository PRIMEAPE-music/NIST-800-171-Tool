import { Router } from 'express';
import { documentService } from '../services/document.service';
import { DocumentFilters, DocumentCategory } from '../types/document.types';
import { prisma } from '@/config/database';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
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
  fileFilter: (_req, file, cb) => {
    // Allow PDF and Word documents
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Only PDF and Word documents are accepted.`));
    }
  },
});

// ============================================================================
// GET ENDPOINTS
// ============================================================================

/**
 * GET /api/documents
 * Get all documents with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const filters: DocumentFilters = {
      category: req.query.category as DocumentCategory,
      fileType: req.query.fileType as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      organization: req.query.organization as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      isActive: req.query.isActive === 'false' ? false : true,
      searchTerm: req.query.searchTerm as string,
      uploadedBy: req.query.uploadedBy as string,
    };

    const documents = await documentService.getDocuments(filters);

    return res.json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/documents/stats
 * Get document statistics
 */
router.get('/stats', async (_req, res) => {
  try {
    const stats = await documentService.getDocumentStats();
    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching document stats:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/documents/ssp
 * Get the active System Security Plan
 */
router.get('/ssp', async (_req, res) => {
  try {
    const ssp = await documentService.getSystemSecurityPlan();

    if (!ssp) {
      return res.status(404).json({
        success: false,
        error: 'No active System Security Plan found',
      });
    }

    return res.json({
      success: true,
      document: ssp,
    });
  } catch (error) {
    console.error('Error fetching SSP:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/documents/:id
 * Get a specific document by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const document = await documentService.getDocumentById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    return res.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/documents/:id/view
 * View a document file inline (for PDFs in iframe)
 */
router.get('/:id/view', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const document = await documentService.getDocumentById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    // Check if file exists
    try {
      await fs.access(document.filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Document file not found on disk',
      });
    }

    // Set headers for inline viewing
    res.setHeader('Content-Type', document.fileType);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
    res.setHeader('Content-Length', document.fileSize);
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Accept-Ranges', 'bytes');

    // Stream the file
    const fileStream = require('fs').createReadStream(document.filePath);
    fileStream.pipe(res);
    return;
  } catch (error) {
    console.error('Error viewing document:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/documents/:id/download
 * Download a document file
 */
router.get('/:id/download', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const document = await documentService.getDocumentById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    // Check if file exists
    try {
      await fs.access(document.filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Document file not found on disk',
      });
    }

    // Set headers for download
    res.setHeader('Content-Type', document.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Length', document.fileSize);

    // Stream the file
    const fileStream = require('fs').createReadStream(document.filePath);
    fileStream.pipe(res);
    return;
  } catch (error) {
    console.error('Error downloading document:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// POST ENDPOINTS
// ============================================================================

/**
 * POST /api/documents/upload
 * Upload a new document
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    const {
      category = 'general',
      title,
      description,
      organization,
      expiryDate,
      tags,
      version = '1.0',
      uploadedBy,
    } = req.body;

    // Parse tags if provided
    const parsedTags = tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [];

    // Create document record
    const document = await prisma.document.create({
      data: {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        category,
        title: title || req.file.originalname,
        description,
        organization,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        version,
        tags: parsedTags.length > 0 ? JSON.stringify(parsedTags) : null,
        uploadedBy,
        isActive: true,
      },
    });

    return res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        ...document,
        uploadedDate: document.uploadedDate.toISOString(),
        expiryDate: document.expiryDate?.toISOString(),
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
        tags: parsedTags,
      },
    });
  } catch (error) {
    console.error('Error uploading document:', error);

    // Clean up uploaded file if database operation fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/documents/upload/bulk
 * Upload multiple documents
 */
router.post('/upload/bulk', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided',
      });
    }

    const {
      category = 'general',
      organization,
      uploadedBy,
    } = req.body;

    const results = {
      totalFiles: files.length,
      successful: [] as any[],
      failed: [] as any[],
    };

    for (const file of files) {
      try {
        const document = await prisma.document.create({
          data: {
            fileName: file.filename,
            originalName: file.originalname,
            filePath: file.path,
            fileType: file.mimetype,
            fileSize: file.size,
            category,
            title: file.originalname,
            organization,
            uploadedBy,
            isActive: true,
          },
        });

        results.successful.push({
          documentId: document.id,
          originalName: file.originalname,
        });
      } catch (error) {
        results.failed.push({
          originalName: file.originalname,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Clean up file
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
    }

    return res.json({
      success: true,
      message: `Uploaded ${results.successful.length} of ${results.totalFiles} documents`,
      results,
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// PUT/PATCH ENDPOINTS
// ============================================================================

/**
 * PATCH /api/documents/:id
 * Update document metadata
 */
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      title,
      description,
      category,
      organization,
      expiryDate,
      tags,
      version,
    } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (organization !== undefined) updateData.organization = organization;
    if (version !== undefined) updateData.version = version;
    if (expiryDate !== undefined) {
      updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }
    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags : undefined;
    }

    const document = await documentService.updateDocument(id, updateData);

    return res.json({
      success: true,
      message: 'Document updated successfully',
      document,
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/documents/:id/toggle-status
 * Toggle document active status
 */
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const document = await documentService.toggleDocumentStatus(id);

    return res.json({
      success: true,
      message: `Document ${document.isActive ? 'activated' : 'deactivated'} successfully`,
      document,
    });
  } catch (error) {
    console.error('Error toggling document status:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// DELETE ENDPOINTS
// ============================================================================

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await documentService.deleteDocument(id);

    return res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
