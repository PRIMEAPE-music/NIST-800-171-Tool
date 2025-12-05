// Document categories
export type DocumentCategory = 'ssp' | 'external_compliance' | 'certification' | 'audit' | 'general';

// Document interface
export interface Document {
  id: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  title?: string;
  description?: string;
  uploadedBy?: string;
  uploadedDate: string;
  version: string;
  organization?: string;
  expiryDate?: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Document filters
export interface DocumentFilters {
  category?: DocumentCategory;
  fileType?: string;
  tags?: string[];
  organization?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  searchTerm?: string;
  uploadedBy?: string;
}

// Document statistics
export interface DocumentStats {
  totalDocuments: number;
  totalSize: number;
  byCategory: Record<DocumentCategory, number>;
  byFileType: Record<string, number>;
  hasSSP: boolean;
}

// Upload result
export interface DocumentUploadResult {
  success: boolean;
  message: string;
  document?: Document;
  error?: string;
}

// Bulk upload result
export interface BulkDocumentUploadResult {
  success: boolean;
  message: string;
  results: {
    totalFiles: number;
    successful: Array<{
      documentId: number;
      originalName: string;
    }>;
    failed: Array<{
      originalName: string;
      error: string;
    }>;
  };
}

// Upload progress (for UI)
export interface DocumentUploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}
