export interface Evidence {
  id: number;
  controlId: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  description?: string | null;
  uploadedBy?: string | null;
  uploadedDate: Date;
  version: number;
  tags?: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvidenceWithControl extends Evidence {
  control: {
    id: number;
    controlId: string;
    family: string;
    title: string;
  };
}

export interface CreateEvidenceInput {
  controlId: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  description?: string;
  tags?: string[];
}

export interface UpdateEvidenceInput {
  description?: string;
  tags?: string[];
  isArchived?: boolean;
}

export interface EvidenceFilters {
  controlId?: number;
  family?: string;
  fileType?: string;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  isArchived?: boolean;
}

export interface EvidenceStats {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  controlsWithEvidence: number;
  controlsWithoutEvidence: number;
}
