// API client for assessment operations

import api from './api';

export interface AssessmentData {
  controlId: number;
  isImplemented: boolean;
  hasEvidence: boolean;
  isTested: boolean;
  meetsRequirement: boolean;
  assessorNotes?: string;
}

export interface AssessmentResponse {
  id: number;
  controlId: number;
  controlNumber: string;
  controlTitle: string;
  assessmentDate: string;
  isImplemented: boolean;
  hasEvidence: boolean;
  isTested: boolean;
  meetsRequirement: boolean;
  riskScore: number;
  assessorNotes?: string;
  createdAt: string;
}

export interface AssessmentStats {
  totalControls: number;
  assessedControls: number;
  implementedControls: number;
  controlsWithEvidence: number;
  testedControls: number;
  fullyCompliantControls: number;
  averageRiskScore: number;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface GapItem {
  controlId: number;
  controlNumber: string;
  controlTitle: string;
  family: string;
  priority: string;
  riskScore: number;
  isImplemented: boolean;
  hasEvidence: boolean;
  isTested: boolean;
  meetsRequirement: boolean;
  gapDescription: string;
}

class AssessmentService {
  /**
   * Create a new assessment
   */
  async createAssessment(data: AssessmentData): Promise<AssessmentResponse> {
    const response = await api.post('/assessments', data);
    return response.data;
  }

  /**
   * Update an existing assessment
   */
  async updateAssessment(
    id: number,
    data: Partial<AssessmentData>
  ): Promise<AssessmentResponse> {
    const response = await api.put(`/assessments/${id}`, data);
    return response.data;
  }

  /**
   * Get assessment by ID
   */
  async getAssessmentById(id: number): Promise<AssessmentResponse> {
    const response = await api.get(`/assessments/${id}`);
    return response.data;
  }

  /**
   * Get all assessments with optional filters
   */
  async getAllAssessments(filters?: {
    controlId?: number;
    family?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<AssessmentResponse[]> {
    const params = new URLSearchParams();
    if (filters?.controlId) params.append('controlId', filters.controlId.toString());
    if (filters?.family) params.append('family', filters.family);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);

    const response = await api.get(`/assessments?${params}`);
    return response.data;
  }

  /**
   * Get latest assessment for each control
   */
  async getLatestAssessments(): Promise<AssessmentResponse[]> {
    const response = await api.get('/assessments/latest');
    return response.data;
  }

  /**
   * Get assessment statistics
   */
  async getStats(): Promise<AssessmentStats> {
    const response = await api.get('/assessments/stats');
    return response.data;
  }

  /**
   * Get gap analysis
   */
  async getGapAnalysis(): Promise<GapItem[]> {
    const response = await api.get('/assessments/gaps');
    return response.data;
  }

  /**
   * Compare assessments between two dates
   */
  async compareAssessments(oldDate: string, newDate: string) {
    const response = await api.get('/assessments/compare', {
      params: { oldDate, newDate },
    });
    return response.data;
  }

  /**
   * Delete an assessment
   */
  async deleteAssessment(id: number): Promise<void> {
    await api.delete(`/assessments/${id}`);
  }
}

export default new AssessmentService();
