import { Poam, PoamMilestone } from '@prisma/client';

export type PoamWithMilestones = Poam & {
  milestones: PoamMilestone[];
};

export type PoamWithControl = Poam & {
  control: {
    id: number;
    controlId: string;
    title: string;
    family: string;
  };
  milestones: PoamMilestone[];
};

export enum PoamStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  RISK_ACCEPTED = 'Risk Accepted',
}

export enum PoamPriority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export enum MilestoneStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
}

export interface CreatePoamDto {
  controlId: number;
  gapDescription: string;
  remediationPlan: string;
  assignedTo?: string;
  priority?: PoamPriority;
  status?: PoamStatus;
  startDate?: Date | string;
  targetCompletionDate?: Date | string;
  resourcesRequired?: string;
  budgetEstimate?: number;
}

export interface UpdatePoamDto {
  gapDescription?: string;
  remediationPlan?: string;
  assignedTo?: string;
  priority?: PoamPriority;
  status?: PoamStatus;
  startDate?: Date | string;
  targetCompletionDate?: Date | string;
  actualCompletionDate?: Date | string;
  resourcesRequired?: string;
  budgetEstimate?: number;
  riskAcceptanceNotes?: string;
}

export interface CreateMilestoneDto {
  milestoneDescription: string;
  dueDate: Date | string;
  status?: MilestoneStatus;
  notes?: string;
}

export interface UpdateMilestoneDto {
  milestoneDescription?: string;
  dueDate?: Date | string;
  completionDate?: Date | string;
  status?: MilestoneStatus;
  notes?: string;
}

export interface PoamFilters {
  status?: PoamStatus;
  priority?: PoamPriority;
  controlId?: number;
  assignedTo?: string;
  overdue?: boolean;
}

export interface PoamStats {
  total: number;
  byStatus: Record<PoamStatus, number>;
  byPriority: Record<PoamPriority, number>;
  overdue: number;
  completedThisMonth: number;
}
