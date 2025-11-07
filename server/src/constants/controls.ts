// NIST 800-171 Rev 3 Constants

export const NIST_REVISION = '3';
export const NIST_VERSION = 'NIST SP 800-171 Revision 3';
export const PUBLICATION_DATE = 'May 2024';
export const TOTAL_CONTROLS = 110;

export const CONTROL_FAMILIES = {
  AC: { name: 'Access Control', controlCount: 22 },
  AT: { name: 'Awareness and Training', controlCount: 3 },
  AU: { name: 'Audit and Accountability', controlCount: 9 },
  CA: { name: 'Assessment, Authorization, and Monitoring', controlCount: 9 },
  CM: { name: 'Configuration Management', controlCount: 11 },
  CP: { name: 'Contingency Planning', controlCount: 3 },
  IA: { name: 'Identification and Authentication', controlCount: 11 },
  IR: { name: 'Incident Response', controlCount: 5 },
  MA: { name: 'Maintenance', controlCount: 6 },
  MP: { name: 'Media Protection', controlCount: 7 },
  PE: { name: 'Physical Protection', controlCount: 6 },
  PS: { name: 'Personnel Security', controlCount: 8 },
  RA: { name: 'Risk Assessment', controlCount: 5 },
  SA: { name: 'System and Services Acquisition', controlCount: 3 },
  SC: { name: 'System and Communications Protection', controlCount: 13 },
  SI: { name: 'System and Information Integrity', controlCount: 7 },
  SR: { name: 'Supply Chain Risk Management', controlCount: 3 },
  PL: { name: 'Planning', controlCount: 3 },
} as const;

export type ControlFamilyCode = keyof typeof CONTROL_FAMILIES;

export const PRIORITY_LEVELS = {
  Critical: {
    description: 'Controls that are essential for protecting CUI and must be implemented immediately',
    examples: ['MFA', 'Encryption', 'Access Control'],
  },
  High: {
    description: 'Controls that significantly reduce risk and should be prioritized',
    examples: ['Remote Access Control', 'Wireless Security'],
  },
  Medium: {
    description: 'Controls that provide important security functions',
    examples: ['Session Management', 'Maintenance Controls'],
  },
  Low: {
    description: 'Controls that support overall security posture',
    examples: ['Security Notices', 'Awareness Training'],
  },
} as const;

export const CONTROL_STATUSES = [
  'Not Started',
  'In Progress',
  'Implemented',
  'Not Applicable',
] as const;
