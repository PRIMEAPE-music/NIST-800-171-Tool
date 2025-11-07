// NIST 800-171 Revision 3 - Enums and Constants (Client)
// Aligned with server-side enums

/**
 * Control Implementation Status Values
 */
export enum ControlStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  IMPLEMENTED = 'Implemented',
  VERIFIED = 'Verified',
}

/**
 * Control Priority Levels
 */
export enum ControlPriority {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

/**
 * NIST 800-171r3 Control Families
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
 * Human-readable names for control families with control counts
 */
export const FAMILY_LABELS: Record<string, string> = {
  AC: 'Access Control (22)',
  AT: 'Awareness & Training (3)',
  AU: 'Audit & Accountability (9)',
  CA: 'Security Assessment (9)',
  CM: 'Configuration Mgmt (11)',
  CP: 'Contingency Planning (4)',
  IA: 'Identification & Auth (11)',
  IR: 'Incident Response (6)',
  MA: 'Maintenance (6)',
  MP: 'Media Protection (7)',
  PE: 'Physical Protection (6)',
  PS: 'Personnel Security (8)',
  RA: 'Risk Assessment (5)',
  SA: 'System & Services Acq (22)',
  SC: 'System & Comm Protection (29)',
  SI: 'System & Info Integrity (23)',
  SR: 'Supply Chain Risk (11)',
  PL: 'Planning (9)',
};

/**
 * Full family names without counts
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
