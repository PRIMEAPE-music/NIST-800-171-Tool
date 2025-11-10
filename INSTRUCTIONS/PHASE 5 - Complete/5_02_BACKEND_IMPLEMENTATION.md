# Phase 5: Backend Implementation - Evidence API

## Overview
This document covers the complete backend implementation for evidence management, including file upload middleware, API routes, controllers, and service layer.

## Directory Structure
```
server/src/
├── middleware/
│   └── upload.middleware.ts        # Multer configuration
├── routes/
│   └── evidence.routes.ts          # Evidence endpoints
├── controllers/
│   └── evidence.controller.ts      # Request handlers
├── services/
│   └── evidence.service.ts         # Business logic
├── utils/
│   ├── file-validator.ts           # File validation
│   └── file-helpers.ts             # File operations
└── types/
    └── evidence.types.ts           # TypeScript types (already created)
```

## 1. Upload Middleware

### File: `server/src/middleware/upload.middleware.ts`

```typescript
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';

// Ensure uploads directory exists
const UPLOADS_DIR = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Allowed file types
const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'pdf,docx,xlsx,png,jpg,jpeg,txt,csv')
  .split(',')
  .map(type => type.trim().toLowerCase());

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  txt: ['text/plain'],
  csv: ['text/csv', 'application/csv'],
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    // Get control family from request body or default to 'GENERAL'
    const family = req.body.family || 'GENERAL';
    const familyDir = path.join(UPLOADS_DIR, family);
    
    // Create family directory if it doesn't exist
    if (!fs.existsSync(familyDir)) {
      fs.mkdirSync(familyDir, { recursive: true });
    }
    
    cb(null, familyDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Generate unique filename: timestamp_hash_originalname
    const timestamp = Date.now();
    const hash = crypto.randomBytes(4).toString('hex');
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_') // Sanitize
      .substring(0, 50); // Limit length
    
    const filename = `${timestamp}_${hash}_${nameWithoutExt}${ext}`;
    cb(null, filename);
  },
});

// File filter function
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const ext = path.extname(file.originalname).substring(1).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();
  
  // Check extension
  if (!ALLOWED_TYPES.includes(ext)) {
    cb(new Error(`File type .${ext} is not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}`));
    return;
  }
  
  // Check MIME type
  const allowedMimes = ALLOWED_MIME_TYPES[ext] || [];
  if (!allowedMimes.includes(mimeType)) {
    cb(new Error(`Invalid MIME type ${mimeType} for .${ext} file`));
    return;
  }
  
  cb(null, true);
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 10, // Max 10 files per request
  },
});

// Export middleware for single and multiple uploads
export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10);
```

## 2. File Validation Utilities

### File: `server/src/utils/file-validator.ts`

```typescript
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const stat = promisify(fs.stat);
const access = promisify(fs.access);

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate that file exists and is readable
 */
export async function validateFileExists(filePath: string): Promise<FileValidationResult> {
  try {
    await access(filePath, fs.constants.R_OK);
    const stats = await stat(filePath);
    
    if (!stats.isFile()) {
      return { isValid: false, error: 'Path is not a file' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'File does not exist or is not readable' };
  }
}

/**
 * Validate file path doesn't contain path traversal
 */
export function validateFilePath(filePath: string): FileValidationResult {
  const normalized = path.normalize(filePath);
  
  // Check for path traversal attempts
  if (normalized.includes('..')) {
    return { isValid: false, error: 'Invalid file path: path traversal detected' };
  }
  
  // Check that path starts with uploads directory
  const uploadsDir = path.resolve(process.env.UPLOAD_PATH || './uploads');
  const resolvedPath = path.resolve(normalized);
  
  if (!resolvedPath.startsWith(uploadsDir)) {
    return { isValid: false, error: 'Invalid file path: outside uploads directory' };
  }
  
  return { isValid: true };
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return path.extname(filename).substring(1).toLowerCase();
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}
```

### File: `server/src/utils/file-helpers.ts`

```typescript
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

/**
 * Delete file from disk
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    await unlink(filePath);
    return true;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
}

/**
 * Get file stats
 */
export async function getFileStats(filePath: string) {
  try {
    return await stat(filePath);
  } catch (error) {
    return null;
  }
}

/**
 * Calculate directory size
 */
export async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await stat(filePath);
      
      if (stats.isFile()) {
        totalSize += stats.size;
      } else if (stats.isDirectory()) {
        totalSize += await getDirectorySize(filePath);
      }
    }
  } catch (error) {
    console.error('Error calculating directory size:', error);
  }
  
  return totalSize;
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Get relative path from uploads directory
 */
export function getRelativePath(absolutePath: string): string {
  const uploadsDir = path.resolve(process.env.UPLOAD_PATH || './uploads');
  return path.relative(uploadsDir, absolutePath);
}
```

## 3. Evidence Service

### File: `server/src/services/evidence.service.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import path from 'path';
import {
  Evidence,
  EvidenceWithControl,
  CreateEvidenceInput,
  UpdateEvidenceInput,
  EvidenceFilters,
  EvidenceStats,
} from '../types/evidence.types';
import { deleteFile, fileExists, getDirectorySize } from '../utils/file-helpers';
import { validateFileExists, validateFilePath } from '../utils/file-validator';

const prisma = new PrismaClient();

export class EvidenceService {
  /**
   * Create evidence record in database
   */
  async createEvidence(input: CreateEvidenceInput): Promise<Evidence> {
    // Validate file exists
    const uploadsDir = process.env.UPLOAD_PATH || './uploads';
    const absolutePath = path.join(uploadsDir, input.filePath);
    const validation = await validateFileExists(absolutePath);
    
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    return await prisma.evidence.create({
      data: {
        controlId: input.controlId,
        fileName: input.fileName,
        originalName: input.originalName,
        filePath: input.filePath,
        fileType: input.fileType,
        fileSize: input.fileSize,
        description: input.description,
        tags: input.tags ? JSON.stringify(input.tags) : null,
      },
    });
  }

  /**
   * Get all evidence with optional filters
   */
  async getEvidence(filters?: EvidenceFilters): Promise<EvidenceWithControl[]> {
    const where: any = {};
    
    if (filters?.controlId) {
      where.controlId = filters.controlId;
    }
    
    if (filters?.family) {
      where.control = { family: filters.family };
    }
    
    if (filters?.fileType) {
      where.fileType = { contains: filters.fileType };
    }
    
    if (filters?.startDate || filters?.endDate) {
      where.uploadedDate = {};
      if (filters.startDate) where.uploadedDate.gte = filters.startDate;
      if (filters.endDate) where.uploadedDate.lte = filters.endDate;
    }
    
    if (filters?.isArchived !== undefined) {
      where.isArchived = filters.isArchived;
    }
    
    return await prisma.evidence.findMany({
      where,
      include: {
        control: {
          select: {
            id: true,
            controlId: true,
            family: true,
            title: true,
          },
        },
      },
      orderBy: { uploadedDate: 'desc' },
    });
  }

  /**
   * Get evidence by ID
   */
  async getEvidenceById(id: string): Promise<EvidenceWithControl | null> {
    return await prisma.evidence.findUnique({
      where: { id },
      include: {
        control: {
          select: {
            id: true,
            controlId: true,
            family: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Get evidence for specific control
   */
  async getEvidenceForControl(controlId: string): Promise<Evidence[]> {
    return await prisma.evidence.findMany({
      where: { controlId },
      orderBy: { uploadedDate: 'desc' },
    });
  }

  /**
   * Update evidence metadata
   */
  async updateEvidence(id: string, input: UpdateEvidenceInput): Promise<Evidence> {
    const data: any = {};
    
    if (input.description !== undefined) data.description = input.description;
    if (input.isArchived !== undefined) data.isArchived = input.isArchived;
    if (input.tags) data.tags = JSON.stringify(input.tags);
    
    return await prisma.evidence.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete evidence (record and file)
   */
  async deleteEvidence(id: string): Promise<boolean> {
    const evidence = await prisma.evidence.findUnique({ where: { id } });
    
    if (!evidence) {
      throw new Error('Evidence not found');
    }
    
    // Delete file from disk
    const uploadsDir = process.env.UPLOAD_PATH || './uploads';
    const absolutePath = path.join(uploadsDir, evidence.filePath);
    
    if (fileExists(absolutePath)) {
      await deleteFile(absolutePath);
    }
    
    // Delete database record
    await prisma.evidence.delete({ where: { id } });
    
    return true;
  }

  /**
   * Get controls without evidence (gap analysis)
   */
  async getControlsWithoutEvidence(): Promise<any[]> {
    const allControls = await prisma.control.findMany({
      select: {
        id: true,
        controlId: true,
        family: true,
        title: true,
        priority: true,
      },
    });
    
    const controlsWithEvidence = await prisma.evidence.findMany({
      select: { controlId: true },
      distinct: ['controlId'],
    });
    
    const evidenceControlIds = new Set(controlsWithEvidence.map(e => e.controlId));
    
    return allControls.filter(control => !evidenceControlIds.has(control.id));
  }

  /**
   * Get evidence statistics
   */
  async getEvidenceStats(): Promise<EvidenceStats> {
    const allEvidence = await prisma.evidence.findMany();
    
    const totalFiles = allEvidence.length;
    const totalSize = allEvidence.reduce((sum, e) => sum + e.fileSize, 0);
    
    // Count by file type
    const filesByType: Record<string, number> = {};
    allEvidence.forEach(e => {
      const type = e.fileType.split('/')[1] || 'unknown';
      filesByType[type] = (filesByType[type] || 0) + 1;
    });
    
    // Count controls with evidence
    const controlsWithEvidence = new Set(allEvidence.map(e => e.controlId)).size;
    const totalControls = await prisma.control.count();
    const controlsWithoutEvidence = totalControls - controlsWithEvidence;
    
    return {
      totalFiles,
      totalSize,
      filesByType,
      controlsWithEvidence,
      controlsWithoutEvidence,
    };
  }
}
```

## 4. Evidence Controller

### File: `server/src/controllers/evidence.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { EvidenceService } from '../services/evidence.service';
import { getRelativePath } from '../utils/file-helpers';
import path from 'path';
import fs from 'fs';

const evidenceService = new EvidenceService();

export class EvidenceController {
  /**
   * Upload evidence file(s)
   */
  async uploadEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      const { controlId, description, tags } = req.body;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      
      if (!controlId) {
        // Clean up uploaded files
        files.forEach(file => fs.unlinkSync(file.path));
        return res.status(400).json({ error: 'Control ID is required' });
      }
      
      const createdEvidence = [];
      
      for (const file of files) {
        const evidence = await evidenceService.createEvidence({
          controlId,
          fileName: file.filename,
          originalName: file.originalname,
          filePath: getRelativePath(file.path),
          fileType: file.mimetype,
          fileSize: file.size,
          description,
          tags: tags ? JSON.parse(tags) : undefined,
        });
        
        createdEvidence.push(evidence);
      }
      
      res.status(201).json({
        message: 'Evidence uploaded successfully',
        evidence: createdEvidence,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all evidence with filters
   */
  async getEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      const { controlId, family, fileType, startDate, endDate, isArchived } = req.query;
      
      const filters = {
        controlId: controlId as string | undefined,
        family: family as string | undefined,
        fileType: fileType as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        isArchived: isArchived === 'true' ? true : isArchived === 'false' ? false : undefined,
      };
      
      const evidence = await evidenceService.getEvidence(filters);
      
      res.json({ evidence });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get evidence by ID
   */
  async getEvidenceById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const evidence = await evidenceService.getEvidenceById(id);
      
      if (!evidence) {
        return res.status(404).json({ error: 'Evidence not found' });
      }
      
      res.json({ evidence });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get evidence for specific control
   */
  async getEvidenceForControl(req: Request, res: Response, next: NextFunction) {
    try {
      const { controlId } = req.params;
      const evidence = await evidenceService.getEvidenceForControl(controlId);
      
      res.json({ evidence });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update evidence metadata
   */
  async updateEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { description, tags, isArchived } = req.body;
      
      const evidence = await evidenceService.updateEvidence(id, {
        description,
        tags,
        isArchived,
      });
      
      res.json({ message: 'Evidence updated successfully', evidence });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete evidence
   */
  async deleteEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await evidenceService.deleteEvidence(id);
      
      res.json({ message: 'Evidence deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download evidence file
   */
  async downloadEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const evidence = await evidenceService.getEvidenceById(id);
      
      if (!evidence) {
        return res.status(404).json({ error: 'Evidence not found' });
      }
      
      const uploadsDir = process.env.UPLOAD_PATH || './uploads';
      const filePath = path.join(uploadsDir, evidence.filePath);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }
      
      res.download(filePath, evidence.originalName);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get controls without evidence (gap analysis)
   */
  async getEvidenceGaps(req: Request, res: Response, next: NextFunction) {
    try {
      const gaps = await evidenceService.getControlsWithoutEvidence();
      
      res.json({ gaps, count: gaps.length });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get evidence statistics
   */
  async getEvidenceStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await evidenceService.getEvidenceStats();
      
      res.json({ stats });
    } catch (error) {
      next(error);
    }
  }
}
```

## 5. Evidence Routes

### File: `server/src/routes/evidence.routes.ts`

```typescript
import { Router } from 'express';
import { EvidenceController } from '../controllers/evidence.controller';
import { uploadMultiple } from '../middleware/upload.middleware';

const router = Router();
const evidenceController = new EvidenceController();

// Upload evidence (supports multiple files)
router.post(
  '/upload',
  uploadMultiple,
  (req, res, next) => evidenceController.uploadEvidence(req, res, next)
);

// Get all evidence (with optional filters)
router.get(
  '/',
  (req, res, next) => evidenceController.getEvidence(req, res, next)
);

// Get evidence statistics
router.get(
  '/stats',
  (req, res, next) => evidenceController.getEvidenceStats(req, res, next)
);

// Get evidence gaps (controls without evidence)
router.get(
  '/gaps',
  (req, res, next) => evidenceController.getEvidenceGaps(req, res, next)
);

// Get evidence by ID
router.get(
  '/:id',
  (req, res, next) => evidenceController.getEvidenceById(req, res, next)
);

// Get evidence for specific control
router.get(
  '/control/:controlId',
  (req, res, next) => evidenceController.getEvidenceForControl(req, res, next)
);

// Update evidence metadata
router.put(
  '/:id',
  (req, res, next) => evidenceController.updateEvidence(req, res, next)
);

// Delete evidence
router.delete(
  '/:id',
  (req, res, next) => evidenceController.deleteEvidence(req, res, next)
);

// Download evidence file
router.get(
  '/download/:id',
  (req, res, next) => evidenceController.downloadEvidence(req, res, next)
);

export default router;
```

## 6. Register Routes in Express App

### Update `server/src/index.ts` or `server/src/app.ts`:

```typescript
import evidenceRoutes from './routes/evidence.routes';

// ... other imports and middleware

// Register evidence routes
app.use('/api/evidence', evidenceRoutes);
```

## 7. Error Handling Middleware

Ensure you have proper error handling for multer errors:

### Update `server/src/middleware/error.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', error);
  
  // Handle Multer errors
  if (error instanceof MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: `Maximum file size is ${process.env.MAX_FILE_SIZE} bytes`,
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 10 files per upload',
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected file field',
      });
    }
  }
  
  // Handle file validation errors
  if (error.message.includes('File type') || error.message.includes('MIME type')) {
    return res.status(400).json({ error: error.message });
  }
  
  // Generic error
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
  });
}
```

## Testing the API

### Using cURL:

```bash
# Upload evidence
curl -X POST http://localhost:3001/api/evidence/upload \
  -F "files=@/path/to/document.pdf" \
  -F "controlId=some-control-uuid" \
  -F "description=Access control policy" \
  -F "tags=[\"policy\",\"access-control\"]"

# Get all evidence
curl http://localhost:3001/api/evidence

# Get evidence for control
curl http://localhost:3001/api/evidence/control/some-control-uuid

# Get evidence gaps
curl http://localhost:3001/api/evidence/gaps

# Get statistics
curl http://localhost:3001/api/evidence/stats

# Download evidence
curl http://localhost:3001/api/evidence/download/some-evidence-uuid \
  --output downloaded-file.pdf
```

## Next Steps
Proceed to `04_FRONTEND_COMPONENTS.md` to build the React UI for evidence management.

## Checklist
- [ ] Created upload middleware with multer
- [ ] Created file validation utilities
- [ ] Created file helper utilities
- [ ] Implemented evidence service
- [ ] Implemented evidence controller
- [ ] Created evidence routes
- [ ] Registered routes in Express app
- [ ] Updated error handling middleware
- [ ] Tested API endpoints with cURL or Postman
- [ ] All endpoints return expected responses
- [ ] File uploads are working
- [ ] Files are stored in correct directories
- [ ] Database records are created correctly
