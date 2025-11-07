import { z } from 'zod';

// ============================================================================
// NIST 800-171 Rev 3 Validation Schemas
// ============================================================================

// Rev 3 control ID format: 03.01.01 (zero-padded)
export const controlIdSchema = z.string().regex(
  /^03\.\d{2}\.\d{2}$/,
  'Control ID must be in format: 03.01.01'
);

// Rev 3 families including SA, SR, PL (new in Rev 3)
export const controlFamilySchema = z.enum([
  'AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR',
  'MA', 'MP', 'PE', 'PS', 'RA', 'SA', 'SC', 'SI', 'SR', 'PL'
]);

export const prioritySchema = z.enum(['Critical', 'High', 'Medium', 'Low']);

// Updated to include 'Verified' status (Phase 2.1 requirement)
export const controlStatusSchema = z.enum([
  'Not Started',
  'In Progress',
  'Implemented',
  'Verified'
]);

// ============================================================================
// Control CRUD Schemas
// ============================================================================

export const controlSchema = z.object({
  controlId: controlIdSchema,
  family: controlFamilySchema,
  title: z.string().min(1, 'Title is required'),
  requirementText: z.string().min(1, 'Requirement text is required'),
  discussionText: z.string().optional(),
  priority: prioritySchema,
  revision: z.string().default('3'),
  publicationDate: z.string().default('May 2024'),
});

export const createControlSchema = controlSchema;
export const updateControlSchema = controlSchema.partial();

// ============================================================================
// Control Status Update Schemas
// ============================================================================

// Schema for PUT /api/controls/:id (update control details)
export const updateControlDetailsSchema = z.object({
  implementationNotes: z.string().optional(),
  assignedTo: z.string().optional(),
  nextReviewDate: z.string().datetime().optional(),
});

// Schema for PATCH /api/controls/:id/status (update status only)
export const updateControlStatusSchema = z.object({
  status: controlStatusSchema,
  implementationDate: z.string().datetime().optional(),
  lastReviewedDate: z.string().datetime().optional(),
  assignedTo: z.string().optional(),
});

// ============================================================================
// Bulk Operations Schema
// ============================================================================

export const bulkUpdateSchema = z.object({
  controlIds: z.array(z.number().int().positive()).min(1, 'At least one control ID is required'),
  operation: z.enum(['updateStatus', 'assign'], {
    errorMap: () => ({ message: 'Operation must be either updateStatus or assign' }),
  }),
  data: z.object({
    status: controlStatusSchema.optional(),
    assignedTo: z.string().optional(),
  }).refine(
    (data) => data.status !== undefined || data.assignedTo !== undefined,
    { message: 'Either status or assignedTo must be provided' }
  ),
});

// ============================================================================
// Query/Filter Schemas
// ============================================================================

export const controlFilterSchema = z.object({
  family: z.union([controlFamilySchema, z.array(controlFamilySchema)]).optional(),
  priority: z.union([prioritySchema, z.array(prioritySchema)]).optional(),
  status: z.union([controlStatusSchema, z.array(controlStatusSchema)]).optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(50),
  sortBy: z.enum(['controlId', 'title', 'family', 'priority', 'createdAt', 'updatedAt']).optional().default('controlId'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// ============================================================================
// Helper validation functions
// ============================================================================

/**
 * Validate control ID format
 */
export function validateControlId(controlId: string): boolean {
  return /^03\.\d{2}\.\d{2}$/.test(controlId);
}

/**
 * Validate control family
 */
export function validateControlFamily(family: string): boolean {
  const validFamilies = ['AC', 'AT', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'MP', 'PE', 'PS', 'RA', 'SA', 'SC', 'SI', 'SR', 'PL'];
  return validFamilies.includes(family);
}

/**
 * Validate control status
 */
export function validateControlStatus(status: string): boolean {
  const validStatuses = ['Not Started', 'In Progress', 'Implemented', 'Verified'];
  return validStatuses.includes(status);
}

/**
 * Validate control priority
 */
export function validateControlPriority(priority: string): boolean {
  const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
  return validPriorities.includes(priority);
}
