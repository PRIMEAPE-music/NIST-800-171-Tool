import axios from 'axios';
import {
  Document,
  DocumentFilters,
  DocumentStats,
  DocumentUploadResult,
  BulkDocumentUploadResult,
  DocumentCategory,
} from '../types/document.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class DocumentService {
  /**
   * Get all documents with optional filters
   */
  async getDocuments(filters?: DocumentFilters): Promise<Document[]> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.category) params.append('category', filters.category);
      if (filters.fileType) params.append('fileType', filters.fileType);
      if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','));
      if (filters.organization) params.append('organization', filters.organization);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters.searchTerm) params.append('searchTerm', filters.searchTerm);
      if (filters.uploadedBy) params.append('uploadedBy', filters.uploadedBy);
    }

    const response = await axios.get(`${API_BASE_URL}/documents?${params.toString()}`);
    return response.data.documents;
  }

  /**
   * Get document by ID
   */
  async getDocumentById(id: number): Promise<Document> {
    const response = await axios.get(`${API_BASE_URL}/documents/${id}`);
    return response.data.document;
  }

  /**
   * Get the active System Security Plan
   */
  async getSystemSecurityPlan(): Promise<Document | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/documents/ssp`);
      return response.data.document;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(): Promise<DocumentStats> {
    const response = await axios.get(`${API_BASE_URL}/documents/stats`);
    return response.data.stats;
  }

  /**
   * Upload a single document
   */
  async uploadDocument(
    file: File,
    metadata: {
      category?: DocumentCategory;
      title?: string;
      description?: string;
      organization?: string;
      expiryDate?: string;
      tags?: string[];
      version?: string;
      uploadedBy?: string;
    } = {}
  ): Promise<DocumentUploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    // Append metadata
    if (metadata.category) formData.append('category', metadata.category);
    if (metadata.title) formData.append('title', metadata.title);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.organization) formData.append('organization', metadata.organization);
    if (metadata.expiryDate) formData.append('expiryDate', metadata.expiryDate);
    if (metadata.version) formData.append('version', metadata.version);
    if (metadata.uploadedBy) formData.append('uploadedBy', metadata.uploadedBy);
    if (metadata.tags && metadata.tags.length > 0) {
      formData.append('tags', JSON.stringify(metadata.tags));
    }

    const response = await axios.post(`${API_BASE_URL}/documents/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Upload multiple documents
   */
  async uploadDocuments(
    files: File[],
    metadata: {
      category?: DocumentCategory;
      organization?: string;
      uploadedBy?: string;
    } = {}
  ): Promise<BulkDocumentUploadResult> {
    const formData = new FormData();

    // Append all files
    files.forEach((file) => {
      formData.append('files', file);
    });

    // Append metadata
    if (metadata.category) formData.append('category', metadata.category);
    if (metadata.organization) formData.append('organization', metadata.organization);
    if (metadata.uploadedBy) formData.append('uploadedBy', metadata.uploadedBy);

    const response = await axios.post(`${API_BASE_URL}/documents/upload/bulk`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    id: number,
    data: {
      title?: string;
      description?: string;
      category?: DocumentCategory;
      organization?: string;
      expiryDate?: string | null;
      tags?: string[];
      version?: string;
    }
  ): Promise<Document> {
    const response = await axios.patch(`${API_BASE_URL}/documents/${id}`, data);
    return response.data.document;
  }

  /**
   * Toggle document active status
   */
  async toggleDocumentStatus(id: number): Promise<Document> {
    const response = await axios.patch(`${API_BASE_URL}/documents/${id}/toggle-status`);
    return response.data.document;
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/documents/${id}`);
  }

  /**
   * Download a document
   */
  async downloadDocument(id: number, originalName: string): Promise<void> {
    const response = await axios.get(`${API_BASE_URL}/documents/${id}/download`, {
      responseType: 'blob',
    });

    // Create a download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', originalName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get document view URL for preview
   */
  getDocumentViewUrl(id: number): string {
    return `${API_BASE_URL}/documents/${id}/view`;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: DocumentCategory): string {
    const names: Record<DocumentCategory, string> = {
      ssp: 'System Security Plan',
      external_compliance: 'External Compliance',
      certification: 'Certification',
      audit: 'Audit',
      general: 'General',
    };
    return names[category] || category;
  }

  /**
   * Get category color
   */
  getCategoryColor(category: DocumentCategory): string {
    const colors: Record<DocumentCategory, string> = {
      ssp: 'primary',
      external_compliance: 'secondary',
      certification: 'success',
      audit: 'warning',
      general: 'default',
    };
    return colors[category] || 'default';
  }
}

export const documentService = new DocumentService();
export default documentService;
