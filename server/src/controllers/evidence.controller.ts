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
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }

      if (!controlId) {
        // Clean up uploaded files
        files.forEach(file => fs.unlinkSync(file.path));
        res.status(400).json({ error: 'Control ID is required' });
        return;
      }

      // Parse controlId as integer
      const controlIdInt = parseInt(controlId);
      if (isNaN(controlIdInt)) {
        // Clean up uploaded files
        files.forEach(file => fs.unlinkSync(file.path));
        res.status(400).json({ error: 'Invalid Control ID' });
        return;
      }

      const createdEvidence = [];

      for (const file of files) {
        const evidence = await evidenceService.createEvidence({
          controlId: controlIdInt,
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
        controlId: controlId ? parseInt(controlId as string) : undefined,
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
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid evidence ID' });
        return;
      }

      const evidence = await evidenceService.getEvidenceById(id);

      if (!evidence) {
        res.status(404).json({ error: 'Evidence not found' });
        return;
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
      const controlId = parseInt(req.params.controlId);
      if (isNaN(controlId)) {
        res.status(400).json({ error: 'Invalid control ID' });
        return;
      }

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
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid evidence ID' });
        return;
      }

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
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid evidence ID' });
        return;
      }

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
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid evidence ID' });
        return;
      }

      const evidence = await evidenceService.getEvidenceById(id);

      if (!evidence) {
        res.status(404).json({ error: 'Evidence not found' });
        return;
      }

      const uploadsDir = process.env.UPLOAD_PATH || './uploads';
      const filePath = path.join(uploadsDir, evidence.filePath);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'File not found on disk' });
        return;
      }

      res.download(filePath, evidence.originalName);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get controls without evidence (gap analysis)
   */
  async getEvidenceGaps(_req: Request, res: Response, next: NextFunction) {
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
  async getEvidenceStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await evidenceService.getEvidenceStats();

      res.json({ stats });
    } catch (error) {
      next(error);
    }
  }
}
