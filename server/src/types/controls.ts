// NIST 800-171 Rev 3 Control Types

export type ControlFamily =
  | 'AC' | 'AT' | 'AU' | 'CA' | 'CM' | 'CP'
  | 'IA' | 'IR' | 'MA' | 'MP' | 'PE' | 'PS'
  | 'RA' | 'SA' | 'SC' | 'SI' | 'SR' | 'PL';

export type ControlPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export type ControlStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Implemented'
  | 'Not Applicable';

export interface Control {
  id: string;
  controlId: string; // Format: "03.01.01" for Rev 3
  family: ControlFamily;
  title: string;
  requirementText: string;
  discussionText?: string;
  priority: ControlPriority;
  revision: string; // "3" for Rev 3
  publicationDate: string; // "May 2024"
  createdAt: Date;
  updatedAt: Date;
}

export interface ControlWithStatus extends Control {
  status: ControlStatus;
  statusUpdatedAt?: Date;
  notes?: string;
}

export interface ControlFamilyInfo {
  code: string;
  name: string;
  description?: string;
  controlCount: number;
}

export interface ControlFilters {
  family?: ControlFamily | ControlFamily[];
  priority?: ControlPriority | ControlPriority[];
  status?: ControlStatus | ControlStatus[];
  search?: string;
}
