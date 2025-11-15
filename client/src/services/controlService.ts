import api from './api';

// ============================================================================
// Interfaces
// ============================================================================

export interface Control {
  id: number;
  controlId: string;
  family: string;
  title: string;
  requirementText: string;
  discussionText?: string;
  priority: string;
  revision: string;
  publicationDate: string;
  status?: {
    status: string;
    implementationDate?: string;
    lastReviewedDate?: string;
    assignedTo?: string;
    implementationNotes?: string;
  };
  evidence?: any[];
  assessments?: any[];
  improvementActionProgress?: {
    controlId: string;
    totalActions: number;
    completedActions: number;
    inProgressActions: number;
    notStartedActions: number;
    unknownActions: number;
    progressPercentage: number;
    status: 'Completed' | 'InProgress' | 'NotStarted' | 'NotApplicable';
  };
}

export interface ComplianceStats {
  overall: {
    total: number;
    byStatus: {
      notStarted: number;
      inProgress: number;
      implemented: number;
      verified: number;
    };
    compliancePercentage: number;
  };
  byFamily: Record<string, any>;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recentActivity: any[];
  topGaps: any[];
  improvementActions?: {
    totalActions: number;
    completedActions: number;
    progressPercentage: number;
    controlsWithProgress: {
      total: number;
      completed: number;
      inProgress: number;
      notStarted: number;
    };
  };
}

export interface ControlFilters {
  family?: string;
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BulkUpdateData {
  controlIds: number[];
  operation: 'updateStatus' | 'assign';
  data: {
    status?: string;
    assignedTo?: string;
  };
}

// ============================================================================
// Control Service
// ============================================================================

export const controlService = {
  /**
   * Get all controls with optional filters and pagination
   */
  async getAllControls(filters?: ControlFilters): Promise<PaginatedResponse<Control>> {
    const params = new URLSearchParams();

    if (filters?.family) params.append('family', filters.family);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await api.get<PaginatedResponse<Control>>(
      `/controls?${params.toString()}`
    );

    return response.data;
  },

  /**
   * Get compliance statistics
   */
  async getComplianceStats(): Promise<ComplianceStats> {
    const response = await api.get<{ success: boolean; data: ComplianceStats }>(
      '/controls/stats'
    );

    return response.data.data;
  },

  /**
   * Get summary statistics
   */
  async getSummaryStats(): Promise<any> {
    const response = await api.get<{ success: boolean; data: any }>(
      '/controls/stats/summary'
    );

    return response.data.data;
  },

  /**
   * Get family statistics
   */
  async getFamilyStats(family: string): Promise<any> {
    const response = await api.get<{ success: boolean; data: any }>(
      `/controls/stats/family/${family}`
    );

    return response.data.data;
  },

  /**
   * Get control by database ID
   */
  async getControlById(id: number): Promise<Control> {
    const response = await api.get<{ success: boolean; data: Control }>(
      `/controls/${id}`
    );

    return response.data.data;
  },

  /**
   * Get control by control ID (e.g., "03.01.01" for Rev 3)
   */
  async getControlByControlId(controlId: string): Promise<Control> {
    const response = await api.get<{ success: boolean; data: Control }>(
      `/controls/control/${controlId}`
    );

    return response.data.data;
  },

  /**
   * Update control details (PUT)
   */
  async updateControl(
    id: number,
    data: {
      implementationNotes?: string;
      assignedTo?: string;
      nextReviewDate?: string;
    }
  ): Promise<void> {
    await api.put(`/controls/${id}`, data);
  },

  /**
   * Update control status (PATCH)
   */
  async updateControlStatus(
    id: number,
    data: {
      status: string;
      implementationDate?: string;
      lastReviewedDate?: string;
      assignedTo?: string;
    }
  ): Promise<void> {
    await api.patch(`/controls/${id}/status`, data);
  },

  /**
   * Bulk update controls
   */
  async bulkUpdate(data: BulkUpdateData): Promise<{ success: boolean; message: string; count: number }> {
    const response = await api.post<{ success: boolean; message: string; count: number }>(
      '/controls/bulk',
      data
    );

    return response.data;
  },

  /**
   * Get statistics for dashboard (includes improvement actions)
   */
  async getStatistics(): Promise<ComplianceStats> {
    // Fetch both compliance stats and summary stats in parallel
    const [complianceStats, summaryResponse] = await Promise.all([
      this.getComplianceStats(),
      api.get<{ success: boolean; data: any }>('/controls/stats/summary')
    ]);

    // Merge improvement actions data into compliance stats
    return {
      ...complianceStats,
      improvementActions: summaryResponse.data.data.improvementActions
    };
  },
};
