// NIST 800-171 Revision 3 - Enums and Constants
// All values aligned with NIST SP 800-171 Rev 3 (May 2024)

/**
 * Control Implementation Status Values
 * Represents the current implementation state of a control
 */
export enum ControlStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  IMPLEMENTED = 'Implemented',
  VERIFIED = 'Verified',
}

/**
 * Control Priority Levels
 * Used to prioritize implementation efforts
 */
export enum ControlPriority {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

/**
 * NIST 800-171r3 Control Families
 * Includes all 18 families from Revision 3
 */
export enum ControlFamily {
  AC = 'AC', // Access Control
  AT = 'AT', // Awareness and Training
  AU = 'AU', // Audit and Accountability
  CA = 'CA', // Security Assessment
  CM = 'CM', // Configuration Management
  CP = 'CP', // Contingency Planning
  IA = 'IA', // Identification and Authentication
  IR = 'IR', // Incident Response
  MA = 'MA', // Maintenance
  MP = 'MP', // Media Protection
  PE = 'PE', // Physical Protection
  PS = 'PS', // Personnel Security
  RA = 'RA', // Risk Assessment
  SA = 'SA', // System and Services Acquisition
  SC = 'SC', // System and Communications Protection
  SI = 'SI', // System and Information Integrity
  SR = 'SR', // Supply Chain Risk Management (NEW in r3)
  PL = 'PL', // Planning (NEW in r3)
}

/**
 * Human-readable names for control families
 */
export const ControlFamilyNames: Record<ControlFamily, string> = {
  [ControlFamily.AC]: 'Access Control',
  [ControlFamily.AT]: 'Awareness and Training',
  [ControlFamily.AU]: 'Audit and Accountability',
  [ControlFamily.CA]: 'Security Assessment',
  [ControlFamily.CM]: 'Configuration Management',
  [ControlFamily.CP]: 'Contingency Planning',
  [ControlFamily.IA]: 'Identification and Authentication',
  [ControlFamily.IR]: 'Incident Response',
  [ControlFamily.MA]: 'Maintenance',
  [ControlFamily.MP]: 'Media Protection',
  [ControlFamily.PE]: 'Physical Protection',
  [ControlFamily.PS]: 'Personnel Security',
  [ControlFamily.RA]: 'Risk Assessment',
  [ControlFamily.SA]: 'System and Services Acquisition',
  [ControlFamily.SC]: 'System and Communications Protection',
  [ControlFamily.SI]: 'System and Information Integrity',
  [ControlFamily.SR]: 'Supply Chain Risk Management',
  [ControlFamily.PL]: 'Planning',
};

/**
 * POAM Status Values
 */
export enum PoamStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  RISK_ACCEPTED = 'Risk Accepted',
}

/**
 * Milestone Status Values
 */
export enum MilestoneStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
}

/**
 * M365 Policy Types
 */
export enum M365PolicyType {
  INTUNE = 'Intune',
  PURVIEW = 'Purview',
  AZURE_AD = 'AzureAD',
  DEFENDER = 'Defender',
}

/**
 * Mapping Confidence Levels
 * REMOVED: No longer mapping policies to controls
 */
// export enum MappingConfidence { }

/**
 * Bulk Operation Types
 */
export enum BulkOperationType {
  UPDATE_STATUS = 'updateStatus',
  ASSIGN = 'assign',
  SET_PRIORITY = 'setPriority',
}

/**
 * Helper function to get all valid status values as array
 */
export function getAllControlStatuses(): string[] {
  return Object.values(ControlStatus);
}

/**
 * Helper function to get all valid priority values as array
 */
export function getAllControlPriorities(): string[] {
  return Object.values(ControlPriority);
}

/**
 * Helper function to get all valid family codes as array
 */
export function getAllControlFamilies(): string[] {
  return Object.values(ControlFamily);
}

/**
 * Helper function to validate control status
 */
export function isValidControlStatus(status: string): status is ControlStatus {
  return Object.values(ControlStatus).includes(status as ControlStatus);
}

/**
 * Helper function to validate control priority
 */
export function isValidControlPriority(priority: string): priority is ControlPriority {
  return Object.values(ControlPriority).includes(priority as ControlPriority);
}

/**
 * Helper function to validate control family
 */
export function isValidControlFamily(family: string): family is ControlFamily {
  return Object.values(ControlFamily).includes(family as ControlFamily);
}
