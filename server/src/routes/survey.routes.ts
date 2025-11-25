import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/surveys - Get all surveys
router.get('/', async (req, res) => {
  try {
    const surveys = await prisma.survey.findMany({
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: {
              select: { questions: true }
            }
          }
        }
      },
      orderBy: { createdDate: 'desc' }
    });

    res.json(surveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

// GET /api/surveys/:surveyId - Get specific survey with all data
router.get('/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params;

    const survey = await prisma.survey.findUnique({
      where: { surveyId },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            questions: {
              orderBy: { sortOrder: 'asc' },
              include: {
                answers: {
                  orderBy: { createdAt: 'desc' },
                  take: 1 // Get most recent answer
                }
              }
            }
          }
        }
      }
    });

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    res.json(survey);
  } catch (error) {
    console.error('Error fetching survey:', error);
    res.status(500).json({ error: 'Failed to fetch survey' });
  }
});

// GET /api/surveys/:surveyId/sections/:sectionId - Get specific section
router.get('/:surveyId/sections/:sectionId', async (req, res) => {
  try {
    const { surveyId, sectionId } = req.params;

    const survey = await prisma.survey.findUnique({
      where: { surveyId }
    });

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const section = await prisma.surveySection.findFirst({
      where: {
        surveyId: survey.id,
        sectionId
      },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            answers: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json(section);
  } catch (error) {
    console.error('Error fetching section:', error);
    res.status(500).json({ error: 'Failed to fetch section' });
  }
});

export default router;
