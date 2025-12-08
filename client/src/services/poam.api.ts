import axios from 'axios';
import {
  Poam,
  PoamWithControl,
  CreatePoamDto,
  UpdatePoamDto,
  PoamMilestone,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  PoamStats,
  PoamFilters,
  BulkOperationResponse,
  ControlOption,
} from '../types/poam.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const poamApi = {
  // POAM operations
  getAllPoams: async (filters?: PoamFilters): Promise<PoamWithControl[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.controlId) params.append('controlId', filters.controlId.toString());
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.overdue) params.append('overdue', 'true');

    const response = await axios.get(`${API_BASE}/poams?${params}`);
    return response.data;
  },

  getPoamById: async (id: number): Promise<PoamWithControl> => {
    const response = await axios.get(`${API_BASE}/poams/${id}`);
    return response.data;
  },

  createPoam: async (data: CreatePoamDto): Promise<Poam> => {
    const response = await axios.post(`${API_BASE}/poams`, data);
    return response.data;
  },

  updatePoam: async (id: number, data: UpdatePoamDto): Promise<Poam> => {
    const response = await axios.put(`${API_BASE}/poams/${id}`, data);
    return response.data;
  },

  updatePoamStatus: async (id: number, status: string): Promise<Poam> => {
    const response = await axios.patch(`${API_BASE}/poams/${id}/status`, {
      status,
    });
    return response.data;
  },

  deletePoam: async (id: number): Promise<void> => {
    await axios.delete(`${API_BASE}/poams/${id}`);
  },

  getPoamStats: async (): Promise<PoamStats> => {
    const response = await axios.get(`${API_BASE}/poams/stats`);
    return response.data;
  },

  // Milestone operations
  addMilestone: async (
    poamId: number,
    data: CreateMilestoneDto
  ): Promise<PoamMilestone> => {
    const response = await axios.post(
      `${API_BASE}/poams/${poamId}/milestones`,
      data
    );
    return response.data;
  },

  updateMilestone: async (
    poamId: number,
    milestoneId: number,
    data: UpdateMilestoneDto
  ): Promise<PoamMilestone> => {
    const response = await axios.put(
      `${API_BASE}/poams/${poamId}/milestones/${milestoneId}`,
      data
    );
    return response.data;
  },

  completeMilestone: async (
    poamId: number,
    milestoneId: number
  ): Promise<PoamMilestone> => {
    const response = await axios.patch(
      `${API_BASE}/poams/${poamId}/milestones/${milestoneId}/complete`
    );
    return response.data;
  },

  deleteMilestone: async (poamId: number, milestoneId: number): Promise<void> => {
    await axios.delete(`${API_BASE}/poams/${poamId}/milestones/${milestoneId}`);
  },

  uncompleteMilestone: async (
    poamId: number,
    milestoneId: number
  ): Promise<PoamMilestone> => {
    const response = await axios.patch(
      `${API_BASE}/poams/${poamId}/milestones/${milestoneId}/uncomplete`
    );
    return response.data.data;
  },

  // Export operations
  exportPoamPdf: async (poamId: number): Promise<Blob> => {
    const response = await axios.post(
      `${API_BASE}/poams/${poamId}/export/pdf`,
      {},
      { responseType: 'blob' }
    );
    return response.data;
  },

  exportBulkPdf: async (poamIds: number[]): Promise<Blob> => {
    const response = await axios.post(
      `${API_BASE}/poams/export/bulk-pdf`,
      { poamIds },
      { responseType: 'blob' }
    );
    return response.data;
  },

  exportExcel: async (poamIds: number[]): Promise<Blob> => {
    const response = await axios.post(
      `${API_BASE}/poams/export/excel`,
      { poamIds },
      { responseType: 'blob' }
    );
    return response.data;
  },

  exportCsv: async (poamIds: number[]): Promise<Blob> => {
    const response = await axios.post(
      `${API_BASE}/poams/export/csv`,
      { poamIds },
      { responseType: 'blob' }
    );
    return response.data;
  },

  // Bulk operations
  bulkUpdateStatus: async (
    poamIds: number[],
    status: string
  ): Promise<BulkOperationResponse> => {
    const response = await axios.patch(`${API_BASE}/poams/bulk-update-status`, {
      poamIds,
      status,
    });
    return response.data;
  },

  bulkDelete: async (poamIds: number[]): Promise<BulkOperationResponse> => {
    const response = await axios.delete(`${API_BASE}/poams/bulk-delete`, {
      data: { poamIds },
    });
    return response.data;
  },

  // Get unique controls for autocomplete
  getControls: async (): Promise<ControlOption[]> => {
    const response = await axios.get(`${API_BASE}/poams/controls`);
    return response.data.data;
  },
};

// Helper function to download blob as file
export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
