import { Router } from 'express';
import { gapAnalysisService } from '../services/gapAnalysis.service';
import { poamService } from '../services/poam.service';

const router = Router();

/**
 * GET /api/gaps/summary
 * Get overall gap summary across all controls
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await gapAnalysisService.getOverallGapSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error getting gap summary:', error);
    res.status(500).json({ error: 'Failed to get gap summary' });
  }
});

/**
 * GET /api/gaps/control/:controlId
 * Get gap analysis for a specific control
 */
router.get('/control/:controlId', async (req, res) => {
  try {
    const { controlId } = req.params;
    const analysis = await gapAnalysisService.getControlGapAnalysis(controlId);

    if (!analysis) {
      return res.status(404).json({ error: 'Control not found' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error getting control gap analysis:', error);
    res.status(500).json({ error: 'Failed to get gap analysis' });
  }
});

/**
 * PATCH /api/gaps/:gapId
 * Update a gap's status or details
 */
router.patch('/:gapId', async (req, res) => {
  try {
    const { gapId } = req.params;
    const { status, assignedTo, dueDate, notes } = req.body;

    const gap = await gapAnalysisService.updateGapStatus(
      parseInt(gapId),
      {
        status,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes,
      }
    );

    res.json(gap);
  } catch (error) {
    console.error('Error updating gap:', error);
    res.status(500).json({ error: 'Failed to update gap' });
  }
});

/**
 * POST /api/gaps/poam/generate
 * Generate POA&M from gaps
 */
router.post('/poam/generate', async (req, res) => {
  try {
    const { controlId, severity, status } = req.body;

    const poam = await poamService.generatePOAMFromGaps({
      controlId,
      severity,
      status,
    });

    res.json(poam);
  } catch (error) {
    console.error('Error generating POA&M:', error);
    res.status(500).json({ error: 'Failed to generate POA&M' });
  }
});

/**
 * POST /api/gaps/:gapId/poam
 * Create POA&M item from a gap
 */
router.post('/:gapId/poam', async (req, res) => {
  try {
    const { gapId } = req.params;
    const poamItem = await poamService.createPOAMItemFromGap(parseInt(gapId));
    res.json(poamItem);
  } catch (error) {
    console.error('Error creating POA&M from gap:', error);
    res.status(500).json({ error: 'Failed to create POA&M' });
  }
});

export default router;
