export interface Evidence {
  id: number;
  controlId: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  description?: string;
  uploadedBy?: string;
  uploadedDate: string;
  version: number;
  tags?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  control?: {
    id: number;
    controlId: string;
    family: string;
    title: string;
  };
}

export interface EvidenceFilters {
  controlId?: number;
  family?: string;
  fileType?: string;
  startDate?: string;
  endDate?: string;
  isArchived?: boolean;
  searchTerm?: string;
}

export interface EvidenceStats {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  controlsWithEvidence: number;
  controlsWithoutEvidence: number;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}
