import { Request, Response } from 'express';
import { backupService } from '../services/backup.service';

/**
 * POST /api/backup/create
 * Create a new database backup
 */
export const createBackup = async (req: Request, res: Response) => {
  try {
    const backup = await backupService.createBackup();

    res.json({
      success: true,
      message: 'Backup created successfully',
      backup: {
        filename: backup.filename,
        size: backup.size,
        createdAt: backup.createdAt,
        metadata: backup.metadata,
      },
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/backup/list
 * List all available backups
 */
export const listBackups = async (req: Request, res: Response) => {
  try {
    const backups = await backupService.listBackups();

    res.json({
      success: true,
      backups,
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backups',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * POST /api/backup/restore
 * Restore from a backup file
 */
export const restoreBackup = async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Backup filename is required',
      });
    }

    await backupService.restoreBackup(filename);

    res.json({
      success: true,
      message: 'Database restored successfully',
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore backup',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * DELETE /api/backup/:filename
 * Delete a backup file
 */
export const deleteBackup = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    await backupService.deleteBackup(filename);

    res.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete backup',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * POST /api/backup/export
 * Export all data as JSON
 */
export const exportData = async (req: Request, res: Response) => {
  try {
    const exportPath = await backupService.exportData();

    res.download(exportPath, (err) => {
      if (err) {
        console.error('Error downloading export:', err);
      }
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/backup/integrity
 * Run integrity checks
 */
export const checkIntegrity = async (req: Request, res: Response) => {
  try {
    const result = await backupService.checkIntegrity();

    res.json({
      success: true,
      integrity: result,
    });
  } catch (error) {
    console.error('Error checking integrity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check integrity',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/backup/health
 * Get system health status
 */
export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    const health = await backupService.getSystemHealth();

    res.json({
      success: true,
      health,
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system health',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * POST /api/backup/clear-assessments
 * Clear all assessment history
 */
export const clearAssessmentHistory = async (req: Request, res: Response) => {
  try {
    const count = await backupService.clearAssessmentHistory();

    res.json({
      success: true,
      message: `Cleared ${count} assessment records`,
      deletedCount: count,
    });
  } catch (error) {
    console.error('Error clearing assessment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear assessment history',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * POST /api/backup/clear-history
 * Clear all change history
 */
export const clearChangeHistory = async (req: Request, res: Response) => {
  try {
    const count = await backupService.clearChangeHistory();

    res.json({
      success: true,
      message: `Cleared ${count} change history records`,
      deletedCount: count,
    });
  } catch (error) {
    console.error('Error clearing change history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear change history',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
