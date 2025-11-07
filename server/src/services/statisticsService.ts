import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { ControlStatus, ControlFamily, ControlPriority } from '@/types/enums';

/**
 * Statistics Service
 * Handles all compliance statistics and reporting calculations
 */
export class StatisticsService {
  /**
   * Get comprehensive compliance statistics
   */
  async getComplianceStats() {
    try {
      logger.info('Calculating compliance statistics');

      // Fetch all controls with their status in a single query for efficiency
      const controls = await prisma.control.findMany({
        include: {
          status: true,
        },
      });

      const total = controls.length;

      // Calculate overall status breakdown
      const byStatus = {
        notStarted: 0,
        inProgress: 0,
        implemented: 0,
        verified: 0,
      };

      controls.forEach((control) => {
        const status = control.status?.status || ControlStatus.NOT_STARTED;
        switch (status) {
          case ControlStatus.NOT_STARTED:
            byStatus.notStarted++;
            break;
          case ControlStatus.IN_PROGRESS:
            byStatus.inProgress++;
            break;
          case ControlStatus.IMPLEMENTED:
            byStatus.implemented++;
            break;
          case ControlStatus.VERIFIED:
            byStatus.verified++;
            break;
        }
      });

      // Calculate compliance percentage (implemented + verified)
      const compliancePercentage = Math.round(
        ((byStatus.implemented + byStatus.verified) / total) * 100
      );

      // Calculate by family
      const byFamily: Record<string, any> = {};
      const families = [...new Set(controls.map((c) => c.family))];

      families.forEach((family) => {
        const familyControls = controls.filter((c) => c.family === family);
        const familyStats = {
          notStarted: 0,
          inProgress: 0,
          implemented: 0,
          verified: 0,
        };

        familyControls.forEach((control) => {
          const status = control.status?.status || ControlStatus.NOT_STARTED;
          switch (status) {
            case ControlStatus.NOT_STARTED:
              familyStats.notStarted++;
              break;
            case ControlStatus.IN_PROGRESS:
              familyStats.inProgress++;
              break;
            case ControlStatus.IMPLEMENTED:
              familyStats.implemented++;
              break;
            case ControlStatus.VERIFIED:
              familyStats.verified++;
              break;
          }
        });

        const familyCompliance = Math.round(
          ((familyStats.implemented + familyStats.verified) / familyControls.length) * 100
        );

        byFamily[family] = {
          total: familyControls.length,
          byStatus: familyStats,
          compliancePercentage: familyCompliance,
        };
      });

      // Calculate by priority
      const byPriority = {
        critical: controls.filter((c) => c.priority === ControlPriority.CRITICAL).length,
        high: controls.filter((c) => c.priority === ControlPriority.HIGH).length,
        medium: controls.filter((c) => c.priority === ControlPriority.MEDIUM).length,
        low: controls.filter((c) => c.priority === ControlPriority.LOW).length,
      };

      // Get recent activity (last 10 changes)
      const recentActivity = await prisma.changeHistory.findMany({
        orderBy: { changedAt: 'desc' },
        take: 10,
        include: {
          control: {
            select: {
              controlId: true,
              title: true,
              family: true,
            },
          },
        },
      });

      // Get top gaps (high priority controls not implemented)
      const topGaps = controls
        .filter((c) => {
          const status = c.status?.status || ControlStatus.NOT_STARTED;
          return (
            (status === ControlStatus.NOT_STARTED || status === ControlStatus.IN_PROGRESS) &&
            (c.priority === ControlPriority.CRITICAL || c.priority === ControlPriority.HIGH)
          );
        })
        .sort((a, b) => {
          const priorityOrder = {
            [ControlPriority.CRITICAL]: 0,
            [ControlPriority.HIGH]: 1,
            [ControlPriority.MEDIUM]: 2,
            [ControlPriority.LOW]: 3,
          };
          return (
            priorityOrder[a.priority as ControlPriority] -
            priorityOrder[b.priority as ControlPriority]
          );
        })
        .slice(0, 10)
        .map((c) => ({
          id: c.id,
          controlId: c.controlId,
          title: c.title,
          family: c.family,
          priority: c.priority,
          status: c.status?.status || ControlStatus.NOT_STARTED,
        }));

      logger.info(`Statistics calculated: ${compliancePercentage}% compliant`);

      return {
        overall: {
          total,
          byStatus,
          compliancePercentage,
        },
        byFamily,
        byPriority,
        recentActivity,
        topGaps,
      };
    } catch (error) {
      logger.error('Error calculating compliance statistics:', error);
      throw error;
    }
  }

  /**
   * Get statistics for a specific family
   */
  async getFamilyStats(family: ControlFamily) {
    try {
      const controls = await prisma.control.findMany({
        where: { family },
        include: {
          status: true,
        },
      });

      const total = controls.length;
      const byStatus = {
        notStarted: 0,
        inProgress: 0,
        implemented: 0,
        verified: 0,
      };

      controls.forEach((control) => {
        const status = control.status?.status || ControlStatus.NOT_STARTED;
        switch (status) {
          case ControlStatus.NOT_STARTED:
            byStatus.notStarted++;
            break;
          case ControlStatus.IN_PROGRESS:
            byStatus.inProgress++;
            break;
          case ControlStatus.IMPLEMENTED:
            byStatus.implemented++;
            break;
          case ControlStatus.VERIFIED:
            byStatus.verified++;
            break;
        }
      });

      const compliancePercentage = Math.round(
        ((byStatus.implemented + byStatus.verified) / total) * 100
      );

      return {
        family,
        total,
        byStatus,
        compliancePercentage,
      };
    } catch (error) {
      logger.error(`Error calculating family statistics for ${family}:`, error);
      throw error;
    }
  }

  /**
   * Get progress over time (for charts)
   * Returns compliance percentage by month for the last 6 months
   */
  async getProgressOverTime() {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Get all status changes in the last 6 months
      const changes = await prisma.changeHistory.findMany({
        where: {
          changedAt: {
            gte: sixMonthsAgo,
          },
          fieldChanged: 'status',
        },
        orderBy: {
          changedAt: 'asc',
        },
      });

      // Group by month and calculate compliance
      // This is a simplified version - in production, you'd want more sophisticated tracking
      const monthlyData: Record<string, number> = {};

      changes.forEach((change) => {
        const monthKey = change.changedAt.toISOString().substring(0, 7); // YYYY-MM
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = 0;
        }
        if (
          change.newValue === ControlStatus.IMPLEMENTED ||
          change.newValue === ControlStatus.VERIFIED
        ) {
          monthlyData[monthKey]++;
        }
      });

      return monthlyData;
    } catch (error) {
      logger.error('Error calculating progress over time:', error);
      throw error;
    }
  }

  /**
   * Get summary statistics for dashboard cards
   */
  async getSummaryStats() {
    try {
      const [total, implementedCount, verifiedCount, criticalCount] = await Promise.all([
        prisma.control.count(),
        prisma.controlStatus.count({
          where: { status: ControlStatus.IMPLEMENTED },
        }),
        prisma.controlStatus.count({
          where: { status: ControlStatus.VERIFIED },
        }),
        prisma.control.count({
          where: {
            priority: ControlPriority.CRITICAL,
            status: {
              status: {
                in: [ControlStatus.NOT_STARTED, ControlStatus.IN_PROGRESS],
              },
            },
          },
        }),
      ]);

      const compliantCount = implementedCount + verifiedCount;
      const compliancePercentage = Math.round((compliantCount / total) * 100);

      return {
        total,
        compliant: compliantCount,
        compliancePercentage,
        criticalGaps: criticalCount,
      };
    } catch (error) {
      logger.error('Error calculating summary statistics:', error);
      throw error;
    }
  }
}

export const statisticsService = new StatisticsService();
