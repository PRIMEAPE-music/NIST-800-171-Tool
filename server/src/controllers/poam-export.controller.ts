import { Request, Response } from 'express';
import { poamExportService } from '../services/poam-export.service';
import { poamService } from '../services/poam.service';
import * as fs from 'fs';

export class PoamExportController {
  /**
   * Export single POAM as PDF
   * @route POST /api/poams/:id/export/pdf
   */
  async exportPdf(req: Request, res: Response): Promise<void> {
    try {
      const poamId = parseInt(req.params.id);

      if (isNaN(poamId)) {
        res.status(400).json({ error: 'Invalid POAM ID' });
        return;
      }

      const poam = await poamService.getPoamById(poamId);

      if (!poam) {
        res.status(404).json({ error: 'POAM not found' });
        return;
      }

      const fileName = `POAM_${poam.control.controlId.replace(/[^a-zA-Z0-9]/g, '_')}_${poamId}_${Date.now()}.pdf`;
      const filePath = await poamExportService.generatePoamPdf(poam, fileName);

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Clean up file after download
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      });
    } catch (error) {
      console.error('PDF export error:', error);
      res.status(500).json({ error: 'Failed to export PDF' });
    }
  }

  /**
   * Export multiple POAMs as PDFs in a ZIP file
   * @route POST /api/poams/export/bulk-pdf
   * @body { poamIds: number[] }
   */
  async exportBulkPdf(req: Request, res: Response): Promise<void> {
    try {
      const { poamIds } = req.body;

      if (!Array.isArray(poamIds) || poamIds.length === 0) {
        res.status(400).json({ error: 'Invalid POAM IDs array' });
        return;
      }

      if (poamIds.some(id => isNaN(parseInt(String(id))))) {
        res.status(400).json({ error: 'All POAM IDs must be valid numbers' });
        return;
      }

      if (poamIds.length > 50) {
        res.status(400).json({ error: 'Maximum 50 POAMs per export' });
        return;
      }

      const zipFileName = `POAMs_Export_${Date.now()}.zip`;
      const zipPath = await poamExportService.generateBulkPdfZip(poamIds, zipFileName);

      res.download(zipPath, zipFileName, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Clean up ZIP file after download
        try {
          if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
          }
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      });
    } catch (error) {
      console.error('Bulk PDF export error:', error);
      res.status(500).json({ error: 'Failed to export PDFs' });
    }
  }

  /**
   * Export POAMs to Excel
   * @route POST /api/poams/export/excel
   * @body { poamIds: number[] }
   */
  async exportExcel(req: Request, res: Response): Promise<void> {
    try {
      const { poamIds } = req.body;

      if (!Array.isArray(poamIds) || poamIds.length === 0) {
        res.status(400).json({ error: 'Invalid POAM IDs array' });
        return;
      }

      if (poamIds.some(id => isNaN(parseInt(String(id))))) {
        res.status(400).json({ error: 'All POAM IDs must be valid numbers' });
        return;
      }

      const fileName = `POAMs_Export_${Date.now()}.xlsx`;
      const filePath = await poamExportService.generateExcel(poamIds, fileName);

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Clean up file after download
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      });
    } catch (error) {
      console.error('Excel export error:', error);
      res.status(500).json({ error: 'Failed to export Excel' });
    }
  }

  /**
   * Export POAMs to CSV
   * @route POST /api/poams/export/csv
   * @body { poamIds: number[] }
   */
  async exportCsv(req: Request, res: Response): Promise<void> {
    try {
      const { poamIds } = req.body;

      if (!Array.isArray(poamIds) || poamIds.length === 0) {
        res.status(400).json({ error: 'Invalid POAM IDs array' });
        return;
      }

      if (poamIds.some(id => isNaN(parseInt(String(id))))) {
        res.status(400).json({ error: 'All POAM IDs must be valid numbers' });
        return;
      }

      const fileName = `POAMs_Export_${Date.now()}.csv`;
      const filePath = await poamExportService.generateCsv(poamIds, fileName);

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Clean up file after download
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      });
    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ error: 'Failed to export CSV' });
    }
  }

  /**
   * Update status for multiple POAMs
   * @route PATCH /api/poams/bulk-update-status
   * @body { poamIds: number[], status: string }
   */
  async bulkUpdateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { poamIds, status } = req.body;

      if (!Array.isArray(poamIds) || poamIds.length === 0) {
        res.status(400).json({ error: 'Invalid POAM IDs array' });
        return;
      }

      if (poamIds.some(id => isNaN(parseInt(String(id))))) {
        res.status(400).json({ error: 'All POAM IDs must be valid numbers' });
        return;
      }

      const validStatuses = ['Open', 'In Progress', 'Completed', 'Risk Accepted'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Invalid status value' });
        return;
      }

      const result = await poamService.bulkUpdateStatus(
        poamIds,
        status as 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted'
      );

      res.json({
        success: true,
        updated: result.count,
        message: `Successfully updated ${result.count} POAM(s) to ${status}`,
      });
    } catch (error) {
      console.error('Bulk status update error:', error);
      res.status(500).json({ error: 'Failed to update POAMs' });
    }
  }

  /**
   * Delete multiple POAMs
   * @route DELETE /api/poams/bulk-delete
   * @body { poamIds: number[] }
   */
  async bulkDelete(req: Request, res: Response): Promise<void> {
    try {
      const { poamIds } = req.body;

      if (!Array.isArray(poamIds) || poamIds.length === 0) {
        res.status(400).json({ error: 'Invalid POAM IDs array' });
        return;
      }

      if (poamIds.some(id => isNaN(parseInt(String(id))))) {
        res.status(400).json({ error: 'All POAM IDs must be valid numbers' });
        return;
      }

      const result = await poamService.bulkDelete(poamIds);

      res.json({
        success: true,
        deleted: result.count,
        message: `Successfully deleted ${result.count} POAM(s)`,
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      res.status(500).json({ error: 'Failed to delete POAMs' });
    }
  }

  /**
   * Unmark milestone as complete
   * @route PATCH /api/poams/:poamId/milestones/:milestoneId/uncomplete
   */
  async uncompleteMilestone(req: Request, res: Response): Promise<void> {
    try {
      const poamId = parseInt(req.params.poamId);
      const milestoneId = parseInt(req.params.milestoneId);

      if (isNaN(poamId) || isNaN(milestoneId)) {
        res.status(400).json({ error: 'Invalid POAM or Milestone ID' });
        return;
      }

      const updated = await poamService.uncompleteMilestone(poamId, milestoneId);

      res.json({
        success: true,
        data: updated,
        message: 'Milestone unmarked successfully',
      });
    } catch (error) {
      console.error('Uncomplete milestone error:', error);
      res.status(500).json({ error: 'Failed to uncomplete milestone' });
    }
  }

  /**
   * Get unique control IDs from POAMs for autocomplete
   * @route GET /api/poams/controls
   */
  async getControls(req: Request, res: Response): Promise<void> {
    try {
      const controls = await poamService.getUniqueControls();

      res.json({
        success: true,
        data: controls,
      });
    } catch (error) {
      console.error('Get controls error:', error);
      res.status(500).json({ error: 'Failed to fetch controls' });
    }
  }
}

export const poamExportController = new PoamExportController();
