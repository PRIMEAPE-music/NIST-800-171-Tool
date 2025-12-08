import axios from 'axios';
import {
  Evidence,
  EvidenceFilters,
  EvidenceStats,
  EvidenceCoverage,
  ControlSuggestion,
  UploadResult,
  BulkUploadResult,
  ManualReviewEvidenceSummary,
  EvidenceType,
  EvidenceRelationship,
} from '../types/evidence.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class EvidenceService {
  /**
   * Get all evidence with optional filters
   */
  async getEvidence(filters?: EvidenceFilters): Promise<Evidence[]> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.controlId) params.append('controlId', filters.controlId.toString());
      if (filters.family) params.append('family', filters.family);
      if (filters.evidenceType) params.append('evidenceType', filters.evidenceType);
      if (filters.status) params.append('status', filters.status);
      if (filters.fileType) params.append('fileType', filters.fileType);
      if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','));
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.isArchived !== undefined) params.append('isArchived', filters.isArchived.toString());
      if (filters.searchTerm) params.append('searchTerm', filters.searchTerm);
      if (filters.uploadedBy) params.append('uploadedBy', filters.uploadedBy);
      if (filters.hasMultipleControls !== undefined) params.append('hasMultipleControls', filters.hasMultipleControls.toString());
    }

    const response = await axios.get(`${API_BASE_URL}/evidence?${params.toString()}`);
    return response.data.evidence;
  }

  /**
   * Get evidence by ID
   */
  async getEvidenceById(id: number): Promise<Evidence> {
    const response = await axios.get(`${API_BASE_URL}/evidence/${id}`);
    return response.data.evidence;
  }

  /**
   * Get evidence for a specific control
   */
  async getEvidenceForControl(controlId: number): Promise<Evidence[]> {
    return this.getEvidence({ controlId });
  }

  /**
   * Get evidence statistics
   */
  async getEvidenceStats(): Promise<EvidenceStats> {
    const response = await axios.get(`${API_BASE_URL}/evidence/stats`);
    return response.data.stats;
  }

  /**
   * Get evidence coverage
   */
  async getEvidenceCoverage(family?: string): Promise<EvidenceCoverage[]> {
    const params = family ? `?family=${family}` : '';
    const response = await axios.get(`${API_BASE_URL}/evidence/coverage${params}`);
    return response.data.coverage;
  }

  /**
   * Get evidence gaps (controls without evidence)
   */
  async getEvidenceGaps(): Promise<EvidenceCoverage[]> {
    const response = await axios.get(`${API_BASE_URL}/evidence/gaps`);
    return response.data.gaps;
  }

  /**
   * Get manual review evidence summary
   */
  async getManualReviewEvidenceSummary(): Promise<ManualReviewEvidenceSummary> {
    const response = await axios.get(`${API_BASE_URL}/evidence/manual-reviews`);
    return response.data.summary;
  }

  /**
   * Suggest controls for evidence
   */
  async suggestControlsForEvidence(
    filename: string,
    evidenceType?: EvidenceType
  ): Promise<ControlSuggestion[]> {
    const params = new URLSearchParams({ filename });
    if (evidenceType) params.append('evidenceType', evidenceType);

    const response = await axios.get(`${API_BASE_URL}/evidence/suggest-controls?${params.toString()}`);
    return response.data.suggestions;
  }

  /**
   * Upload single evidence file
   */
  async uploadEvidence(
    file: File,
    data: {
      evidenceType?: EvidenceType;
      description?: string;
      uploadedBy?: string;
      tags?: string[];
      controlMappings?: Array<{
        controlId: number;
        relationship: EvidenceRelationship;
        notes?: string;
      }>;
    },
    onProgress?: (progress: number) => void
  ): Promise<Evidence> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('evidenceType', data.evidenceType || 'general');
    if (data.description) formData.append('description', data.description);
    if (data.uploadedBy) formData.append('uploadedBy', data.uploadedBy);
    if (data.tags) formData.append('tags', JSON.stringify(data.tags));
    if (data.controlMappings) formData.append('controlMappings', JSON.stringify(data.controlMappings));

    const response = await axios.post(`${API_BASE_URL}/evidence/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return response.data.evidence;
  }

  /**
   * Upload multiple evidence files
   */
  async bulkUploadEvidence(
    files: File[],
    data: {
      evidenceType?: EvidenceType;
      uploadedBy?: string;
      defaultControlMappings?: Array<{
        controlId: number;
        relationship: EvidenceRelationship;
        notes?: string;
      }>;
    },
    onProgress?: (progress: number) => void
  ): Promise<BulkUploadResult> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    formData.append('evidenceType', data.evidenceType || 'general');
    if (data.uploadedBy) formData.append('uploadedBy', data.uploadedBy);
    if (data.defaultControlMappings) {
      formData.append('defaultControlMappings', JSON.stringify(data.defaultControlMappings));
    }

    const response = await axios.post(`${API_BASE_URL}/evidence/bulk-upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  }

  /**
   * Update evidence metadata
   */
  async updateEvidence(
    id: number,
    data: {
      description?: string;
      tags?: string[];
      evidenceType?: EvidenceType;
      status?: string;
      reviewNotes?: string;
    }
  ): Promise<Evidence> {
    const response = await axios.patch(`${API_BASE_URL}/evidence/${id}`, data);
    return response.data.evidence;
  }

  /**
   * Add control mapping to evidence
   */
  async addControlMapping(
    evidenceId: number,
    data: {
      controlId: number;
      relationship: EvidenceRelationship;
      notes?: string;
      mappedBy?: string;
      requirementId?: number;
    }
  ): Promise<Evidence> {
    const response = await axios.post(`${API_BASE_URL}/evidence/${evidenceId}/mappings`, data);
    return response.data.evidence;
  }

  /**
   * Update control mapping
   */
  async updateControlMapping(
    evidenceId: number,
    mappingId: number,
    data: {
      relationship?: EvidenceRelationship;
      notes?: string;
      isVerified?: boolean;
      verifiedBy?: string;
    }
  ): Promise<Evidence> {
    const response = await axios.patch(
      `${API_BASE_URL}/evidence/${evidenceId}/mappings/${mappingId}`,
      data
    );
    return response.data.evidence;
  }

  /**
   * Remove control mapping
   */
  async removeControlMapping(evidenceId: number, mappingId: number): Promise<Evidence> {
    const response = await axios.delete(
      `${API_BASE_URL}/evidence/${evidenceId}/mappings/${mappingId}`
    );
    return response.data.evidence;
  }

  /**
   * Verify control mapping
   */
  async verifyControlMapping(
    evidenceId: number,
    mappingId: number,
    verifiedBy: string = 'user'
  ): Promise<Evidence> {
    const response = await axios.post(
      `${API_BASE_URL}/evidence/${evidenceId}/mappings/${mappingId}/verify`,
      { verifiedBy }
    );
    return response.data.evidence;
  }

  /**
   * Archive evidence
   */
  async archiveEvidence(id: number, archivedBy: string = 'user', reason?: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/evidence/${id}/archive`, { archivedBy, reason });
  }

  /**
   * Unarchive evidence
   */
  async unarchiveEvidence(id: number): Promise<void> {
    await axios.post(`${API_BASE_URL}/evidence/${id}/unarchive`);
  }

  /**
   * Delete evidence
   */
  async deleteEvidence(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/evidence/${id}`);
  }

  /**
   * Download evidence file
   */
  async downloadEvidence(id: number): Promise<void> {
    window.open(`${API_BASE_URL}/evidence/${id}/download`, '_blank');
  }

  /**
   * Get evidence view URL for preview
   */
  getEvidenceViewUrl(id: number): string {
    return `${API_BASE_URL}/evidence/${id}/view`;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get file icon based on mime type
   */
  getFileIcon(mimeType: string): string {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('text')) return '📃';
    return '📎';
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    switch (status) {
      case 'uploaded':
        return 'info';
      case 'under_review':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'expired':
        return 'default';
      default:
        return 'default';
    }
  }

  /**
   * Get relationship color
   */
  getRelationshipColor(relationship: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    switch (relationship) {
      case 'primary':
        return 'primary';
      case 'supporting':
        return 'info';
      case 'referenced':
        return 'secondary';
      case 'supplementary':
        return 'default';
      default:
        return 'default';
    }
  }
}

export const evidenceService = new EvidenceService();
