import axios from 'axios';
import { Evidence, EvidenceFilters, EvidenceStats } from '../types/evidence.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const evidenceService = {
  /**
   * Upload evidence files
   */
  async uploadEvidence(
    files: File[],
    controlId: number,
    description?: string,
    tags?: string[]
  ): Promise<Evidence[]> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    formData.append('controlId', controlId.toString());
    if (description) formData.append('description', description);
    if (tags && tags.length > 0) formData.append('tags', JSON.stringify(tags));

    const response = await axios.post(`${API_BASE_URL}/evidence/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data.evidence;
  },

  /**
   * Get all evidence with filters
   */
  async getEvidence(filters?: EvidenceFilters): Promise<Evidence[]> {
    const params = new URLSearchParams();

    if (filters?.controlId) params.append('controlId', filters.controlId.toString());
    if (filters?.family) params.append('family', filters.family);
    if (filters?.fileType) params.append('fileType', filters.fileType);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.isArchived !== undefined) {
      params.append('isArchived', String(filters.isArchived));
    }

    const response = await axios.get(`${API_BASE_URL}/evidence?${params.toString()}`);
    return response.data.evidence;
  },

  /**
   * Get evidence by ID
   */
  async getEvidenceById(id: number): Promise<Evidence> {
    const response = await axios.get(`${API_BASE_URL}/evidence/${id}`);
    return response.data.evidence;
  },

  /**
   * Get evidence for specific control
   */
  async getEvidenceForControl(controlId: number): Promise<Evidence[]> {
    const response = await axios.get(`${API_BASE_URL}/evidence/control/${controlId}`);
    return response.data.evidence;
  },

  /**
   * Update evidence metadata
   */
  async updateEvidence(
    id: number,
    updates: { description?: string; tags?: string[]; isArchived?: boolean }
  ): Promise<Evidence> {
    const response = await axios.put(`${API_BASE_URL}/evidence/${id}`, updates);
    return response.data.evidence;
  },

  /**
   * Delete evidence
   */
  async deleteEvidence(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/evidence/${id}`);
  },

  /**
   * Get download URL for evidence
   */
  getDownloadUrl(id: number): string {
    return `${API_BASE_URL}/evidence/download/${id}`;
  },

  /**
   * Get controls without evidence (gaps)
   */
  async getEvidenceGaps(): Promise<any[]> {
    const response = await axios.get(`${API_BASE_URL}/evidence/gaps`);
    return response.data.gaps;
  },

  /**
   * Get evidence statistics
   */
  async getEvidenceStats(): Promise<EvidenceStats> {
    const response = await axios.get(`${API_BASE_URL}/evidence/stats`);
    return response.data.stats;
  },
};
