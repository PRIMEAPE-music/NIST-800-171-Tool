/**
 * M365 Validation Service - Updated for Smart Extraction
 *
 * Validates M365 policies against expected settings with intelligent
 * template filtering and multi-strategy value extraction
 *
 * CORRECTED: Uses policyData and proper field names
 */

import { PrismaClient } from '@prisma/client';
import { smartExtractor, ExtractionResult } from './smart-extractor.service.js';

const prisma = new PrismaClient();

export interface ValidationResult {
  policyId: number;
  policyName: string;
  templateFamily: string;
  totalSettings: number;
  extractedSettings: number;
  complianceChecks: Array<{
    settingId: number;
    settingName: string;
    expectedValue: string | null;
    actualValue: any;
    isCompliant: boolean;
    extractionStrategy: string;
    extractionConfidence: number;
  }>;
  extractionRate: string;
  complianceRate: string;
}

/**
 * Validate a single policy against all relevant settings
 * CORRECTED: Uses proper field names and template matching
 */
export async function validatePolicy(policyId: number): Promise<ValidationResult> {
  // Get policy with template info
  const policy = await prisma.m365Policy.findUnique({
    where: { id: policyId }
  });

  if (!policy) {
    throw new Error(`Policy ${policyId} not found`);
  }

  // Get settings that match this policy template
  // FIXED: Only match by exact template, or by family for uncategorized settings
  // Do NOT match by family if setting has a specific policyTemplate
  const relevantSettings = await prisma.m365Setting.findMany({
    where: {
      OR: [
        { policyTemplate: policy.odataType }, // Exact template match
        {
          AND: [
            { policyTemplate: null }, // Only uncategorized settings
            { templateFamily: policy.templateFamily } // Can match by family
          ]
        }
      ],
      isActive: true
    },
    orderBy: { displayName: 'asc' }
  });

  console.log(`Validating policy: ${policy.policyName}`);
  console.log(`  Template: ${policy.odataType}`);
  console.log(`  Family: ${policy.templateFamily}`);
  console.log(`  Relevant settings: ${relevantSettings.length}`);

  // Extract values using smart extractor
  const extractionResults = await smartExtractor.extractBatch(policy, relevantSettings);

  // Build compliance checks
  const complianceChecks = [];
  let extractedCount = 0;
  let compliantCount = 0;

  for (const setting of relevantSettings) {
    const extraction = extractionResults.get(setting.id);

    if (!extraction) continue;

    const wasExtracted = extraction.value !== null && extraction.strategy !== 'none';
    if (wasExtracted) extractedCount++;

    // Check compliance if we have both actual and expected values
    const isCompliant = wasExtracted && setting.expectedValue
      ? checkCompliance(extraction.value, setting.expectedValue, setting.validationOperator)
      : null;

    if (isCompliant) compliantCount++;

    complianceChecks.push({
      settingId: setting.id,
      settingName: setting.displayName,
      expectedValue: setting.expectedValue,
      actualValue: extraction.value,
      isCompliant: isCompliant ?? false,
      extractionStrategy: extraction.strategy,
      extractionConfidence: extraction.confidence
    });

    // Update or create SettingComplianceCheck record
    // CORRECTED: Use proper upsert syntax and field names
    const existingCheck = await prisma.settingComplianceCheck.findFirst({
      where: {
        policyId: policy.id,
        settingId: setting.id
      }
    });

    if (existingCheck) {
      await prisma.settingComplianceCheck.update({
        where: { id: existingCheck.id },
        data: {
          actualValue: extraction.value !== null ? JSON.stringify(extraction.value) : null,
          isCompliant: isCompliant ?? false,
          lastChecked: new Date()
        }
      });
    } else {
      await prisma.settingComplianceCheck.create({
        data: {
          policyId: policy.id,
          settingId: setting.id,
          actualValue: extraction.value !== null ? JSON.stringify(extraction.value) : null,
          expectedValue: setting.expectedValue,
          isCompliant: isCompliant ?? false,
          lastChecked: new Date()
        }
      });
    }
  }

  const extractionRate = relevantSettings.length > 0
    ? `${((extractedCount / relevantSettings.length) * 100).toFixed(1)}%`
    : '0%';

  const complianceRate = extractedCount > 0
    ? `${((compliantCount / extractedCount) * 100).toFixed(1)}%`
    : '0%';

  console.log(`  Extraction: ${extractedCount}/${relevantSettings.length} (${extractionRate})`);
  console.log(`  Compliance: ${compliantCount}/${extractedCount} (${complianceRate})`);

  return {
    policyId: policy.id,
    policyName: policy.policyName,
    templateFamily: policy.templateFamily || 'Unknown',
    totalSettings: relevantSettings.length,
    extractedSettings: extractedCount,
    complianceChecks,
    extractionRate,
    complianceRate
  };
}

/**
 * Validate all policies
 */
export async function validateAllPolicies(): Promise<ValidationResult[]> {
  const policies = await prisma.m365Policy.findMany({
    where: {
      odataType: { not: null } // Only validate categorized policies
    }
  });

  console.log(`\nValidating ${policies.length} policies...\n`);

  const results: ValidationResult[] = [];

  for (const policy of policies) {
    try {
      const result = await validatePolicy(policy.id);
      results.push(result);
    } catch (error) {
      console.error(`Failed to validate policy ${policy.id}:`, error);
    }
  }

  return results;
}

/**
 * Check if actual value meets compliance requirement
 */
function checkCompliance(
  actualValue: any,
  expectedValue: string,
  operator: string
): boolean {
  // Handle existence checks first (before null check)
  if (operator === '!=null' || operator === 'notNull' || operator === 'isNotNull') {
    return actualValue !== null && actualValue !== undefined && actualValue !== '';
  }

  if (operator === '==null' || operator === 'isNull') {
    return actualValue === null || actualValue === undefined || actualValue === '';
  }

  if (actualValue === null || actualValue === undefined) {
    return false;
  }

  // Parse expected value
  let expected: any = expectedValue;
  try {
    expected = JSON.parse(expectedValue);
  } catch {
    // Keep as string
  }

  // Normalize values for comparison
  const actual = String(actualValue).toLowerCase();
  const exp = String(expected).toLowerCase();

  switch (operator) {
    case '==':
    case 'equals':
      return actual === exp;

    case '!=':
    case 'notEquals':
      return actual !== exp;

    case 'contains':
      return actual.includes(exp);

    case '>':
    case 'greaterThan':
      return parseFloat(actual) > parseFloat(exp);

    case '<':
    case 'lessThan':
      return parseFloat(actual) < parseFloat(exp);

    case '>=':
    case 'greaterThanOrEqual':
      return parseFloat(actual) >= parseFloat(exp);

    case '<=':
    case 'lessThanOrEqual':
      return parseFloat(actual) <= parseFloat(exp);

    case 'in':
      try {
        const arr = JSON.parse(expectedValue);
        return Array.isArray(arr) && arr.map(String).includes(String(actualValue));
      } catch {
        return false;
      }

    case 'matches':
      try {
        return new RegExp(expectedValue).test(String(actualValue));
      } catch {
        return false;
      }

    case 'exists':
      return actualValue !== null && actualValue !== undefined;

    default:
      console.warn(`Unknown operator: ${operator}`);
      return actual === exp;
  }
}

/**
 * Get validation summary statistics
 */
export async function getValidationSummary() {
  const stats = await prisma.$queryRaw<Array<{
    templateFamily: string;
    policy_count: number;
    total_checks: number;
    extracted_checks: number;
    compliant_checks: number;
  }>>`
    SELECT
      COALESCE(p.template_family, 'Unknown') as templateFamily,
      COUNT(DISTINCT p.id) as policy_count,
      COUNT(sc.id) as total_checks,
      SUM(CASE WHEN sc.actual_value IS NOT NULL THEN 1 ELSE 0 END) as extracted_checks,
      SUM(CASE WHEN sc.is_compliant = 1 THEN 1 ELSE 0 END) as compliant_checks
    FROM m365_policies p
    LEFT JOIN setting_compliance_checks sc ON sc.policy_id = p.id
    WHERE p.odata_type IS NOT NULL
    GROUP BY p.template_family
    ORDER BY policy_count DESC
  `;

  return stats.map(s => ({
    templateFamily: s.templateFamily,
    policyCount: Number(s.policy_count),
    totalChecks: Number(s.total_checks),
    extractedChecks: Number(s.extracted_checks),
    compliantChecks: Number(s.compliant_checks),
    extractionRate: s.total_checks > 0
      ? `${((Number(s.extracted_checks) / Number(s.total_checks)) * 100).toFixed(1)}%`
      : '0%',
    complianceRate: s.extracted_checks > 0
      ? `${((Number(s.compliant_checks) / Number(s.extracted_checks)) * 100).toFixed(1)}%`
      : '0%'
  }));
}
