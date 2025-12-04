import { Router } from 'express';
import { coverageService } from '../services/coverageService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/coverage/summary
 * Get overall coverage statistics
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await coverageService.getCoverageSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching coverage summary:', error);
    res.status(500).json({ error: 'Failed to fetch coverage summary' });
  }
});

/**
 * GET /api/coverage/control/:controlId
 * Get detailed coverage for a specific control
 */
router.get('/control/:controlId', async (req, res) => {
  try {
    const { controlId } = req.params;
    const coverage = await coverageService.calculateControlCoverage(controlId);
    res.json(coverage);
  } catch (error) {
    console.error('Error fetching control coverage:', error);
    res.status(500).json({ error: 'Failed to fetch control coverage' });
  }
});

/**
 * GET /api/coverage/all
 * Get coverage for all controls
 */
router.get('/all', async (req, res) => {
  try {
    const coverages = await coverageService.calculateAllCoverage();
    res.json(coverages);
  } catch (error) {
    console.error('Error fetching all coverages:', error);
    res.status(500).json({ error: 'Failed to fetch all coverages' });
  }
});

/**
 * GET /api/coverage/family/:family
 * Get coverage breakdown by control family
 */
router.get('/family/:family', async (req, res) => {
  try {
    const { family } = req.params;

    // Get all controls in family
    const controls = await prisma.control.findMany({
      where: { family },
      select: { controlId: true },
    });

    const coverages = await Promise.all(
      controls.map(c => coverageService.calculateControlCoverage(c.controlId))
    );

    const avgCoverage = coverages.length > 0
      ? coverages.reduce((sum, c) => sum + c.overallCoverage, 0) / coverages.length
      : 0;

    res.json({
      family,
      controlCount: coverages.length,
      averageCoverage: Math.round(avgCoverage * 100) / 100,
      controls: coverages,
    });
  } catch (error) {
    console.error('Error fetching family coverage:', error);
    res.status(500).json({ error: 'Failed to fetch family coverage' });
  }
});

export default router;
