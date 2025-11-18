import { prisma } from '@/config/database';
import { logger } from './logger';

/**
 * Check if database is connected and accessible
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection check failed:', error);
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const [
      controlCount,
      assessmentCount,
      evidenceCount,
      poamCount,
      policyCount,
    ] = await Promise.all([
      prisma.control.count(),
      prisma.assessment.count(),
      prisma.evidence.count(),
      prisma.poam.count(),
      prisma.m365Policy.count(),
    ]);

    return {
      controls: controlCount,
      assessments: assessmentCount,
      evidence: evidenceCount,
      poams: poamCount,
      policies: policyCount,
    };
  } catch (error) {
    logger.error('Failed to get database stats:', error);
    throw error;
  }
}

/**
 * Clear all data from database (use with caution!)
 */
export async function clearDatabase(): Promise<void> {
  logger.warn('Clearing all data from database...');

  await prisma.changeHistory.deleteMany();
  // controlPolicyMapping table removed - old system deprecated
  await prisma.poamMilestone.deleteMany();
  await prisma.poam.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.controlStatus.deleteMany();
  await prisma.m365Policy.deleteMany();
  await prisma.control.deleteMany();
  await prisma.setting.deleteMany();

  logger.info('Database cleared successfully');
}

/**
 * Reset database to initial state
 */
export async function resetDatabase(): Promise<void> {
  logger.warn('Resetting database...');
  await clearDatabase();
  // Seed script will be called separately
  logger.info('Database reset complete');
}
