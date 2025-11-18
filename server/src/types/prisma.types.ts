import { Prisma } from '@prisma/client';

// Export Prisma types for use in the application
export type Control = Prisma.ControlGetPayload<object>;
export type ControlStatus = Prisma.ControlStatusGetPayload<object>;
export type Assessment = Prisma.AssessmentGetPayload<object>;
export type Evidence = Prisma.EvidenceGetPayload<object>;
export type Poam = Prisma.PoamGetPayload<object>;
export type PoamMilestone = Prisma.PoamMilestoneGetPayload<object>;
export type M365Policy = Prisma.M365PolicyGetPayload<object>;
export type M365Setting = Prisma.M365SettingGetPayload<object>;
export type ControlSettingMapping = Prisma.ControlSettingMappingGetPayload<object>;
export type SettingComplianceCheck = Prisma.SettingComplianceCheckGetPayload<object>;
export type ControlM365Compliance = Prisma.ControlM365ComplianceGetPayload<object>;
export type ChangeHistory = Prisma.ChangeHistoryGetPayload<object>;
export type Setting = Prisma.SettingGetPayload<object>;

// Control with relations
export type ControlWithRelations = Prisma.ControlGetPayload<{
  include: {
    status: true;
    assessments: true;
    evidence: true;
    poams: true;
    // REMOVED: policyMappings - no longer mapping policies to controls
  };
}>;

// POAM with milestones
export type PoamWithMilestones = Prisma.PoamGetPayload<{
  include: {
    milestones: true;
    control: true;
  };
}>;

// Assessment response types
export type AssessmentWithControl = Prisma.AssessmentGetPayload<{
  include: {
    control: true;
  };
}>;
