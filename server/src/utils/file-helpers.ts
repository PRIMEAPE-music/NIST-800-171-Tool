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
