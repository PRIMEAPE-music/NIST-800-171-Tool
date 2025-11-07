export interface Poam {
  id: number;
  controlId: number;
  gapDescription: string;
  remediationPlan: string;
  assignedTo: string | null;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted';
  startDate: string | null;
  targetCompletionDate: string | null;
  actualCompletionDate: string | null;
  resourcesRequired: string | null;
  budgetEstimate: number | null;
  riskAcceptanceNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PoamMilestone {
  id: number;
  poamId: number;
  milestoneDescription: string;
  dueDate: string;
  completionDate: string | null;
  status: 'Pending' | 'In Progress' | 'Completed';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PoamWithControl extends Poam {
  control: {
    id: number;
    controlId: string;
    title: string;
    family: string;
    requirementText?: string;
  };
  milestones: PoamMilestone[];
}

export interface CreatePoamDto {
  controlId: number;
  gapDescription: string;
  remediationPlan: string;
  assignedTo?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status?: 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted';
  startDate?: string;
  targetCompletionDate?: string;
  resourcesRequired?: string;
  budgetEstimate?: number;
}

export interface UpdatePoamDto {
  gapDescription?: string;
  remediationPlan?: string;
  assignedTo?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status?: 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted';
  startDate?: string;
  targetCompletionDate?: string;
  actualCompletionDate?: string;
  resourcesRequired?: string;
  budgetEstimate?: number;
  riskAcceptanceNotes?: string;
}

export interface CreateMilestoneDto {
  milestoneDescription: string;
  dueDate: string;
  status?: 'Pending' | 'In Progress' | 'Completed';
  notes?: string;
}

export interface UpdateMilestoneDto {
  milestoneDescription?: string;
  dueDate?: string;
  completionDate?: string;
  status?: 'Pending' | 'In Progress' | 'Completed';
  notes?: string;
}

export interface PoamFilters {
  status?: 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted';
  priority?: 'High' | 'Medium' | 'Low';
  controlId?: number;
  assignedTo?: string;
  overdue?: boolean;
}

export interface PoamStats {
  total: number;
  byStatus: {
    Open: number;
    'In Progress': number;
    Completed: number;
    'Risk Accepted': number;
  };
  byPriority: {
    High: number;
    Medium: number;
    Low: number;
  };
  overdue: number;
  completedThisMonth: number;
}
