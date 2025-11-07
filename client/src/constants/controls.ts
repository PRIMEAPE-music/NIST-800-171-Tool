// NIST 800-171 Rev 3 Constants (Client)

export const NIST_REVISION = '3';
export const NIST_VERSION = 'NIST SP 800-171 Revision 3';
export const PUBLICATION_DATE = 'May 2024';
export const TOTAL_CONTROLS = 110;

export const CONTROL_FAMILIES = {
  AC: { name: 'Access Control', controlCount: 22, color: '#1976d2' },
  AT: { name: 'Awareness and Training', controlCount: 3, color: '#388e3c' },
  AU: { name: 'Audit and Accountability', controlCount: 9, color: '#f57c00' },
  CA: { name: 'Assessment, Authorization, and Monitoring', controlCount: 9, color: '#7b1fa2' },
  CM: { name: 'Configuration Management', controlCount: 11, color: '#c2185b' },
  CP: { name: 'Contingency Planning', controlCount: 3, color: '#0097a7' },
  IA: { name: 'Identification and Authentication', controlCount: 11, color: '#5d4037' },
  IR: { name: 'Incident Response', controlCount: 5, color: '#d32f2f' },
  MA: { name: 'Maintenance', controlCount: 6, color: '#303f9f' },
  MP: { name: 'Media Protection', controlCount: 7, color: '#689f38' },
  PE: { name: 'Physical Protection', controlCount: 6, color: '#fbc02d' },
  PS: { name: 'Personnel Security', controlCount: 8, color: '#0288d1' },
  RA: { name: 'Risk Assessment', controlCount: 5, color: '#e64a19' },
  SA: { name: 'System and Services Acquisition', controlCount: 3, color: '#00796b' },
  SC: { name: 'System and Communications Protection', controlCount: 13, color: '#512da8' },
  SI: { name: 'System and Information Integrity', controlCount: 7, color: '#c62828' },
  SR: { name: 'Supply Chain Risk Management', controlCount: 3, color: '#ad1457' },
  PL: { name: 'Planning', controlCount: 3, color: '#00695c' },
} as const;

export type ControlFamilyCode = keyof typeof CONTROL_FAMILIES;

export const PRIORITY_LEVELS = {
  Critical: {
    description: 'Controls that are essential for protecting CUI and must be implemented immediately',
    examples: ['MFA', 'Encryption', 'Access Control'],
    color: '#d32f2f', // Red
  },
  High: {
    description: 'Controls that significantly reduce risk and should be prioritized',
    examples: ['Remote Access Control', 'Wireless Security'],
    color: '#f57c00', // Orange
  },
  Medium: {
    description: 'Controls that provide important security functions',
    examples: ['Session Management', 'Maintenance Controls'],
    color: '#fbc02d', // Yellow
  },
  Low: {
    description: 'Controls that support overall security posture',
    examples: ['Security Notices', 'Awareness Training'],
    color: '#388e3c', // Green
  },
} as const;

export const CONTROL_STATUSES = {
  'Not Started': { color: '#9e9e9e', label: 'Not Started' },
  'In Progress': { color: '#2196f3', label: 'In Progress' },
  'Implemented': { color: '#4caf50', label: 'Implemented' },
  'Not Applicable': { color: '#757575', label: 'Not Applicable' },
} as const;

export const STATUS_OPTIONS = [
  'Not Started',
  'In Progress',
  'Implemented',
  'Not Applicable',
] as const;
