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
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    // Get control family from request body or default to 'GENERAL'
    const family = _req.body.family || 'GENERAL';
    const familyDir = path.join(UPLOADS_DIR, family);

    // Create family directory if it doesn't exist
    if (!fs.existsSync(familyDir)) {
      fs.mkdirSync(familyDir, { recursive: true });
    }

    cb(null, familyDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
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
  _req: Request,
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
