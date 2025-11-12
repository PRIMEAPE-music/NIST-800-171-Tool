import { Router } from 'express';
import {
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  exportData,
  checkIntegrity,
  getSystemHealth,
  clearAssessmentHistory,
  clearChangeHistory,
} from '../controllers/backup.controller';

const router = Router();

// Backup operations
router.post('/create', createBackup);
router.get('/list', listBackups);
router.post('/restore', restoreBackup);
router.delete('/:filename', deleteBackup);

// Data operations
router.post('/export', exportData);
router.get('/integrity', checkIntegrity);
router.get('/health', getSystemHealth);

// Cleanup operations (require confirmation)
router.post('/clear-assessments', clearAssessmentHistory);
router.post('/clear-history', clearChangeHistory);

export default router;
