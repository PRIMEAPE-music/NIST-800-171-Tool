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
