import { Router, Request, Response } from 'express';
import { calculateDoDScore, getScoreColor, getScoreLabel } from '../services/dodScoringService';

const router = Router();

/**
 * GET /api/dod-score
 * Returns the complete DoD Assessment Score calculation
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const scoreResult = await calculateDoDScore();

    res.json({
      success: true,
      data: {
        ...scoreResult,
        scoreColor: getScoreColor(scoreResult.currentScore),
        scoreLabel: getScoreLabel(scoreResult.currentScore),
      },
    });
  } catch (error) {
    console.error('Error calculating DoD score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate DoD score',
    });
  }
});

/**
 * GET /api/dod-score/summary
 * Returns a simplified score summary for dashboard cards
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const scoreResult = await calculateDoDScore();

    res.json({
      success: true,
      data: {
        currentScore: scoreResult.currentScore,
        maxScore: scoreResult.maxScore,
        minScore: scoreResult.minScore,
        pointsDeducted: scoreResult.pointsDeducted,
        verifiedControls: scoreResult.verifiedControls,
        totalControls: scoreResult.totalControls,
        compliancePercentage: scoreResult.compliancePercentage,
        scoreColor: getScoreColor(scoreResult.currentScore),
        scoreLabel: getScoreLabel(scoreResult.currentScore),
      },
    });
  } catch (error) {
    console.error('Error calculating DoD score summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate DoD score summary',
    });
  }
});

/**
 * GET /api/dod-score/family/:family
 * Returns score breakdown for a specific control family
 */
router.get('/family/:family', async (req: Request, res: Response) => {
  try {
    const { family } = req.params;
    const scoreResult = await calculateDoDScore();

    const familyScore = scoreResult.familyScores.find(
      (f) => f.family.toUpperCase() === family.toUpperCase()
    );

    if (!familyScore) {
      return res.status(404).json({
        success: false,
        error: `Family '${family}' not found`,
      });
    }

    res.json({
      success: true,
      data: familyScore,
    });
  } catch (error) {
    console.error('Error calculating family score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate family score',
    });
  }
});

export default router;
