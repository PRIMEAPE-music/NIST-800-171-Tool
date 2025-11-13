import { PrismaClient, Poam, PoamMilestone } from '@prisma/client';
import {
  CreatePoamDto,
  UpdatePoamDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  PoamFilters,
  PoamStats,
  PoamStatus,
  PoamPriority,
} from '../types/poam.types';

const prisma = new PrismaClient();

export class PoamService {
  /**
   * Get all POAMs with optional filtering
   */
  async getAllPoams(filters?: PoamFilters) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.controlId) {
      where.controlId = filters.controlId;
    }

    if (filters?.assignedTo) {
      where.assignedTo = {
        contains: filters.assignedTo,
        mode: 'insensitive',
      };
    }

    if (filters?.overdue) {
      where.targetCompletionDate = {
        lt: new Date(),
      };
      where.status = {
        not: PoamStatus.COMPLETED,
      };
    }

    const poams = await prisma.poam.findMany({
      where,
      include: {
        control: {
          select: {
            id: true,
            controlId: true,
            title: true,
            family: true,
          },
        },
        milestones: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return poams;
  }

  /**
   * Get single POAM by ID
   */
  async getPoamById(id: number) {
    const poam = await prisma.poam.findUnique({
      where: { id },
      include: {
        control: {
          select: {
            id: true,
            controlId: true,
            title: true,
            family: true,
            requirementText: true,
          },
        },
        milestones: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!poam) {
      throw new Error('POAM not found');
    }

    return poam;
  }

  /**
   * Create new POAM
   */
  async createPoam(data: CreatePoamDto) {
    // Validate control exists
    const control = await prisma.control.findUnique({
      where: { id: data.controlId },
    });

    if (!control) {
      throw new Error('Control not found');
    }

    // Validate dates
    if (data.startDate && data.targetCompletionDate) {
      const start = new Date(data.startDate);
      const target = new Date(data.targetCompletionDate);
      if (start > target) {
        throw new Error('Start date cannot be after target completion date');
      }
    }

    const poam = await prisma.poam.create({
      data: {
        controlId: data.controlId,
        gapDescription: data.gapDescription,
        remediationPlan: data.remediationPlan,
        assignedTo: data.assignedTo,
        priority: data.priority || PoamPriority.MEDIUM,
        status: data.status || PoamStatus.OPEN,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        targetCompletionDate: data.targetCompletionDate
          ? new Date(data.targetCompletionDate)
          : undefined,
        resourcesRequired: data.resourcesRequired,
        budgetEstimate: data.budgetEstimate,
      },
      include: {
        control: true,
        milestones: true,
      },
    });

    return poam;
  }

  /**
   * Update POAM
   */
  async updatePoam(id: number, data: UpdatePoamDto) {
    // Check if POAM exists
    const existing = await prisma.poam.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('POAM not found');
    }

    // Validate status transition
    if (data.status) {
      this.validateStatusTransition(existing.status, data.status);
    }

    // If marking as completed, ensure actualCompletionDate is set
    if (data.status === PoamStatus.COMPLETED && !data.actualCompletionDate) {
      data.actualCompletionDate = new Date().toISOString();
    }

    // Validate dates
    if (data.startDate && data.targetCompletionDate) {
      const start = new Date(data.startDate);
      const target = new Date(data.targetCompletionDate);
      if (start > target) {
        throw new Error('Start date cannot be after target completion date');
      }
    }

    const poam = await prisma.poam.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        targetCompletionDate: data.targetCompletionDate
          ? new Date(data.targetCompletionDate)
          : undefined,
        actualCompletionDate: data.actualCompletionDate
          ? new Date(data.actualCompletionDate)
          : undefined,
      },
      include: {
        control: true,
        milestones: true,
      },
    });

    return poam;
  }

  /**
   * Update POAM status only
   */
  async updatePoamStatus(id: number, status: PoamStatus) {
    const existing = await prisma.poam.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('POAM not found');
    }

    this.validateStatusTransition(existing.status, status);

    const updateData: any = { status };

    // Auto-set completion date when marking as completed
    if (status === PoamStatus.COMPLETED && !existing.actualCompletionDate) {
      updateData.actualCompletionDate = new Date();
    }

    const poam = await prisma.poam.update({
      where: { id },
      data: updateData,
      include: {
        milestones: true,
      },
    });

    return poam;
  }

  /**
   * Delete POAM (cascades to milestones)
   */
  async deletePoam(id: number) {
    const existing = await prisma.poam.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('POAM not found');
    }

    await prisma.poam.delete({
      where: { id },
    });

    return { message: 'POAM deleted successfully' };
  }

  /**
   * Add milestone to POAM
   */
  async addMilestone(poamId: number, data: CreateMilestoneDto) {
    // Validate POAM exists
    const poam = await prisma.poam.findUnique({ where: { id: poamId } });
    if (!poam) {
      throw new Error('POAM not found');
    }

    // Validate milestone due date is before or equal to POAM target date
    if (poam.targetCompletionDate) {
      const milestoneDue = new Date(data.dueDate);
      if (milestoneDue > poam.targetCompletionDate) {
        throw new Error(
          'Milestone due date cannot be after POAM target completion date'
        );
      }
    }

    const milestone = await prisma.poamMilestone.create({
      data: {
        poamId,
        milestoneDescription: data.milestoneDescription,
        dueDate: new Date(data.dueDate),
        status: data.status || 'Pending',
        notes: data.notes,
      },
    });

    return milestone;
  }

  /**
   * Update milestone
   */
  async updateMilestone(
    poamId: number,
    milestoneId: number,
    data: UpdateMilestoneDto
  ) {
    // Validate milestone belongs to POAM
    const milestone = await prisma.poamMilestone.findFirst({
      where: { id: milestoneId, poamId },
      include: { poam: true },
    });

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    // Auto-set completion date if marking as completed
    if (data.status === 'Completed' && !data.completionDate) {
      data.completionDate = new Date().toISOString();
    }

    // Validate due date against POAM target date
    if (data.dueDate && milestone.poam.targetCompletionDate) {
      const newDueDate = new Date(data.dueDate);
      if (newDueDate > milestone.poam.targetCompletionDate) {
        throw new Error(
          'Milestone due date cannot be after POAM target completion date'
        );
      }
    }

    const updated = await prisma.poamMilestone.update({
      where: { id: milestoneId },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        completionDate: data.completionDate
          ? new Date(data.completionDate)
          : undefined,
      },
    });

    return updated;
  }

  /**
   * Mark milestone as complete
   */
  async completeMilestone(poamId: number, milestoneId: number) {
    const milestone = await prisma.poamMilestone.findFirst({
      where: { id: milestoneId, poamId },
    });

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    const updated = await prisma.poamMilestone.update({
      where: { id: milestoneId },
      data: {
        status: 'Completed',
        completionDate: new Date(),
      },
    });

    return updated;
  }

  /**
   * Delete milestone
   */
  async deleteMilestone(poamId: number, milestoneId: number) {
    const milestone = await prisma.poamMilestone.findFirst({
      where: { id: milestoneId, poamId },
    });

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    await prisma.poamMilestone.delete({
      where: { id: milestoneId },
    });

    return { message: 'Milestone deleted successfully' };
  }

  /**
   * Get POAM statistics
   */
  async getPoamStats(): Promise<PoamStats> {
    const allPoams = await prisma.poam.findMany();

    const stats: PoamStats = {
      total: allPoams.length,
      byStatus: {
        [PoamStatus.OPEN]: 0,
        [PoamStatus.IN_PROGRESS]: 0,
        [PoamStatus.COMPLETED]: 0,
        [PoamStatus.RISK_ACCEPTED]: 0,
      },
      byPriority: {
        [PoamPriority.HIGH]: 0,
        [PoamPriority.MEDIUM]: 0,
        [PoamPriority.LOW]: 0,
      },
      overdue: 0,
      completedThisMonth: 0,
    };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    allPoams.forEach((poam) => {
      // Count by status
      stats.byStatus[poam.status as PoamStatus]++;

      // Count by priority
      stats.byPriority[poam.priority as PoamPriority]++;

      // Count overdue
      if (
        poam.targetCompletionDate &&
        poam.targetCompletionDate < now &&
        poam.status !== PoamStatus.COMPLETED
      ) {
        stats.overdue++;
      }

      // Count completed this month
      if (
        poam.actualCompletionDate &&
        poam.actualCompletionDate >= startOfMonth
      ) {
        stats.completedThisMonth++;
      }
    });

    return stats;
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ): void {
    const validTransitions: Record<string, string[]> = {
      [PoamStatus.OPEN]: [
        PoamStatus.IN_PROGRESS,
        PoamStatus.RISK_ACCEPTED,
        PoamStatus.COMPLETED,
      ],
      [PoamStatus.IN_PROGRESS]: [
        PoamStatus.COMPLETED,
        PoamStatus.RISK_ACCEPTED,
        PoamStatus.OPEN,
      ],
      [PoamStatus.COMPLETED]: [PoamStatus.IN_PROGRESS], // Allow reopening
      [PoamStatus.RISK_ACCEPTED]: [PoamStatus.OPEN, PoamStatus.IN_PROGRESS],
    };

    if (
      currentStatus !== newStatus &&
      !validTransitions[currentStatus]?.includes(newStatus)
    ) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  // ============================================================================
  // Gap Analysis POA&M Methods (for POAMItem model)
  // ============================================================================

  /**
   * Generate POA&M from gaps
   */
  async generatePOAMFromGaps(options: {
    controlId?: string;
    severity?: string[];
    status?: string[];
  } = {}) {
    const where: any = {};

    if (options.controlId) {
      const control = await prisma.control.findUnique({
        where: { controlId: options.controlId },
      });
      if (control) {
        where.controlId = control.id;
      }
    }

    if (options.severity) {
      where.severity = { in: options.severity };
    }

    if (options.status) {
      where.status = { in: options.status };
    } else {
      // Default to open and in_progress gaps
      where.status = { in: ['open', 'in_progress'] };
    }

    const gaps = await prisma.controlGap.findMany({
      where,
      include: {
        control: true,
      },
      orderBy: [
        { severity: 'desc' },
        { controlId: 'asc' },
      ],
    });

    const poamItems = gaps.map(gap => ({
      controlId: gap.control.controlId,
      controlTitle: gap.control.title,
      weakness: gap.gapDescription,
      riskLevel: gap.severity,
      likelihood: this.calculateLikelihood(gap.severity),
      impact: this.calculateImpact(gap.gapType),
      remediationPlan: gap.remediationGuidance,
      responsibleParty: gap.assignedTo || 'TBD',
      status: gap.status,
      targetDate: gap.dueDate || this.calculateTargetDate(gap.severity),
      milestones: this.generateMilestones(gap.gapType, gap.severity),
    }));

    return poamItems;
  }

  /**
   * Create POA&M item from gap
   */
  async createPOAMItemFromGap(gapId: number) {
    const gap = await prisma.controlGap.findUnique({
      where: { id: gapId },
      include: { control: true },
    });

    if (!gap) throw new Error('Gap not found');

    const poamItem = await prisma.pOAMItem.create({
      data: {
        controlId: gap.controlId,
        gapId: gap.id,
        weakness: gap.gapDescription,
        riskLevel: gap.severity,
        likelihood: this.calculateLikelihood(gap.severity),
        impact: this.calculateImpact(gap.gapType),
        remediationPlan: gap.remediationGuidance,
        requiredResources: this.estimateResources(gap.gapType),
        responsibleParty: gap.assignedTo || 'TBD',
        milestones: JSON.stringify(this.generateMilestones(gap.gapType, gap.severity)),
        status: 'open',
        targetDate: gap.dueDate || this.calculateTargetDate(gap.severity),
        sourceOfFinding: 'gap_analysis',
      },
    });

    return poamItem;
  }

  /**
   * Calculate likelihood based on severity
   */
  private calculateLikelihood(severity: string): string {
    switch (severity) {
      case 'critical': return 'high';
      case 'high': return 'medium';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'medium';
    }
  }

  /**
   * Calculate impact based on gap type
   */
  private calculateImpact(gapType: string): string {
    switch (gapType) {
      case 'technical': return 'high';
      case 'policy': return 'medium';
      case 'procedure': return 'medium';
      case 'evidence': return 'low';
      default: return 'medium';
    }
  }

  /**
   * Calculate target date based on severity
   */
  private calculateTargetDate(severity: string): Date {
    const now = new Date();
    const daysToAdd = {
      'critical': 30,
      'high': 60,
      'medium': 90,
      'low': 120,
    }[severity] || 90;

    now.setDate(now.getDate() + daysToAdd);
    return now;
  }

  /**
   * Generate milestones for gap remediation
   */
  private generateMilestones(gapType: string, severity: string) {
    const targetDays = {
      'critical': 30,
      'high': 60,
      'medium': 90,
      'low': 120,
    }[severity] || 90;

    if (gapType === 'policy') {
      return [
        {
          description: 'Policy template selected or drafted',
          targetDays: Math.round(targetDays * 0.3),
          status: 'pending',
        },
        {
          description: 'Policy customized for organization',
          targetDays: Math.round(targetDays * 0.5),
          status: 'pending',
        },
        {
          description: 'Management review and approval',
          targetDays: Math.round(targetDays * 0.7),
          status: 'pending',
        },
        {
          description: 'Policy published and communicated',
          targetDays: targetDays,
          status: 'pending',
        },
      ];
    }

    if (gapType === 'technical') {
      return [
        {
          description: 'Solution identified and approved',
          targetDays: Math.round(targetDays * 0.2),
          status: 'pending',
        },
        {
          description: 'Configuration completed in test environment',
          targetDays: Math.round(targetDays * 0.5),
          status: 'pending',
        },
        {
          description: 'Testing and validation completed',
          targetDays: Math.round(targetDays * 0.7),
          status: 'pending',
        },
        {
          description: 'Deployed to production',
          targetDays: Math.round(targetDays * 0.9),
          status: 'pending',
        },
        {
          description: 'Verification and documentation',
          targetDays: targetDays,
          status: 'pending',
        },
      ];
    }

    if (gapType === 'procedure') {
      return [
        {
          description: 'Procedure documented',
          targetDays: Math.round(targetDays * 0.4),
          status: 'pending',
        },
        {
          description: 'Management approval obtained',
          targetDays: Math.round(targetDays * 0.6),
          status: 'pending',
        },
        {
          description: 'Staff training completed',
          targetDays: Math.round(targetDays * 0.9),
          status: 'pending',
        },
        {
          description: 'Procedure implemented and verified',
          targetDays: targetDays,
          status: 'pending',
        },
      ];
    }

    // Evidence
    return [
      {
        description: 'Evidence requirements identified',
        targetDays: Math.round(targetDays * 0.3),
        status: 'pending',
      },
      {
        description: 'Evidence collected',
        targetDays: Math.round(targetDays * 0.7),
        status: 'pending',
      },
      {
        description: 'Evidence organized and verified',
        targetDays: targetDays,
        status: 'pending',
      },
    ];
  }

  /**
   * Estimate resources needed
   */
  private estimateResources(gapType: string): string {
    switch (gapType) {
      case 'policy':
        return '8-16 hours (policy development), management review time';
      case 'technical':
        return '16-40 hours (implementation and testing), possible licensing costs';
      case 'procedure':
        return '8-24 hours (documentation and training)';
      case 'evidence':
        return '2-8 hours (collection and organization)';
      default:
        return 'TBD';
    }
  }
}

export const poamService = new PoamService();
