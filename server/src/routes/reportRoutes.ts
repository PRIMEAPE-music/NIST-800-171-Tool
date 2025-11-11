import { Router } from 'express';
import {
  handleGenerateReport,
  handleGetReportHistory,
  handleDownloadReport,
  handleDeleteReport,
  handleGetReportTypes,
  handleBatchGenerateReports,
  handlePreviewReport,
  handleGetReportStatistics,
  handleGetTemplates,
  handleCreateTemplate,
  handleDeleteTemplate,
} from '../controllers/reportController';

const router = Router();

// Report generation and management
router.post('/generate', handleGenerateReport);
router.post('/batch', handleBatchGenerateReports);
router.post('/preview', handlePreviewReport);
router.get('/history', handleGetReportHistory);
router.get('/types', handleGetReportTypes);
router.get('/statistics', handleGetReportStatistics);
router.get('/:id/download', handleDownloadReport);
router.delete('/:id', handleDeleteReport);

// Report templates
router.get('/templates', handleGetTemplates);
router.post('/templates', handleCreateTemplate);
router.delete('/templates/:id', handleDeleteTemplate);

export default router;
