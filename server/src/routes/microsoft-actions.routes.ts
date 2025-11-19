import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/microsoft-actions/control/:controlId
// Get all improvement actions for a specific control (by controlId string like "03.01.01")
router.get('/control/:controlId', async (req: Request, res: Response) => {
  try {
    const { controlId } = req.params;

    // First find the control by its controlId string
    const control = await prisma.control.findFirst({
      where: { controlId }
    });

    if (!control) {
      return res.json({
        success: true,
        data: []
      });
    }

    const mappings = await prisma.improvementActionMapping.findMany({
      where: { controlId: control.id },
      include: {
        action: true
      },
      orderBy: [
        { isPrimary: 'desc' },
        { confidence: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: mappings.map(mapping => ({
        id: mapping.id,
        actionId: mapping.action.actionId,
        actionTitle: mapping.action.actionTitle,
        confidence: mapping.confidence,
        coverageLevel: mapping.coverageLevel,
        isPrimary: mapping.isPrimary,
        mappingRationale: mapping.mappingRationale,
        nistRequirement: mapping.nistRequirement
      }))
    });
  } catch (error) {
    console.error('Error fetching improvement actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch improvement actions'
    });
  }
});

// GET /api/microsoft-actions/stats
// Get statistics about improvement actions coverage
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const totalActions = await prisma.microsoftImprovementAction.count();
    const totalMappings = await prisma.improvementActionMapping.count();
    const controlsWithActions = await prisma.improvementActionMapping.groupBy({
      by: ['controlId'],
      _count: true
    });

    res.json({
      success: true,
      data: {
        totalActions,
        totalMappings,
        controlsWithActions: controlsWithActions.length
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// GET /api/microsoft-actions/all
// Get all improvement actions with their mapping counts
router.get('/all', async (_req: Request, res: Response) => {
  try {
    const actions = await prisma.microsoftImprovementAction.findMany({
      include: {
        _count: {
          select: { mappings: true }
        }
      },
      orderBy: { actionTitle: 'asc' }
    });

    res.json({
      success: true,
      data: actions.map(action => ({
        id: action.id,
        actionId: action.actionId,
        actionTitle: action.actionTitle,
        mappingCount: action._count.mappings
      }))
    });
  } catch (error) {
    console.error('Error fetching all actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch all actions'
    });
  }
});

export default router;
