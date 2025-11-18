import { PrismaClient } from '@prisma/client';
import { validationEngineService } from './validationEngine.service';
import { complianceCalculationService } from './complianceCalculation.service';
import { settingValidationService } from './settingValidation.service';

const prisma = new PrismaClient();

export interface ComplianceCheckResult {
  settingsValidated: number;
  complianceImproved: number;
  complianceDeclined: number;
  controlsAffected: number;
  errors: string[];
}

export interface PolicyComplianceContext {
  changedPolicyIds: number[];
  syncLogId: number;
}

/**
 * Main function to check compliance after policy sync
 * This is called automatically after M365 policies are synced
 */
export async function checkComplianceAfterSync(
  context: PolicyComplianceContext
): Promise<ComplianceCheckResult> {
  const result: ComplianceCheckResult = {
    settingsValidated: 0,
    complianceImproved: 0,
    complianceDeclined: 0,
    controlsAffected: 0,
    errors: [],
  };

  try {
    console.log(`\n🔍 Starting compliance check for ${context.changedPolicyIds.length} changed policies...`);

    // Step 1: Get all settings that reference the changed policies
    const affectedSettings = await findAffectedSettings(context.changedPolicyIds);
    console.log(`   Found ${affectedSettings.length} settings affected by policy changes`);

    if (affectedSettings.length === 0) {
      console.log('   ℹ️  No settings to validate');
      return result;
    }

    // Step 2: Get current compliance state for comparison
    const affectedControlIds = [
      ...new Set(
        affectedSettings.flatMap(s => s.controlMappings.map(m => m.controlId))
      ),
    ];
    const beforeState = await getControlComplianceState(affectedControlIds);
    console.log(`   Will check compliance for ${affectedControlIds.length} controls`);

    // Step 3: Validate each changed policy and store results
    console.log(`\n📝 Validating settings for ${context.changedPolicyIds.length} policies...`);

    for (const policyId of context.changedPolicyIds) {
      try {
        // Validate all settings for this policy
        const validationResults = await settingValidationService.validatePolicySettings(policyId);

        if (validationResults.length > 0) {
          // Store validation results in database
          await settingValidationService.storeValidationResults(validationResults, policyId);
          result.settingsValidated += validationResults.length;

          console.log(`   ✓ Validated ${validationResults.length} settings for policy ${policyId}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Policy ${policyId}: ${errorMessage}`);
        console.error(`   ❌ Error validating policy ${policyId}:`, errorMessage);
      }
    }

    // Step 4: Recalculate compliance for affected controls
    console.log(`\n📊 Recalculating compliance for ${affectedControlIds.length} controls...`);

    for (const controlId of affectedControlIds) {
      try {
        await complianceCalculationService.calculateControlCompliance(controlId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Control ${controlId}: ${errorMessage}`);
        console.error(`   ❌ Error calculating compliance for control ${controlId}:`, errorMessage);
      }
    }

    result.controlsAffected = affectedControlIds.length;

    // Step 5: Compare before/after to track improvements and declines
    const afterState = await getControlComplianceState(affectedControlIds);
    const changes = compareComplianceStates(beforeState, afterState);

    result.complianceImproved = changes.improved;
    result.complianceDeclined = changes.declined;

    console.log(`\n✅ Compliance check complete:`);
    console.log(`   • Settings validated: ${result.settingsValidated}`);
    console.log(`   • Controls checked: ${result.controlsAffected}`);
    console.log(`   • Compliance improved: ${result.complianceImproved} controls`);
    console.log(`   • Compliance declined: ${result.complianceDeclined} controls`);

    if (result.errors.length > 0) {
      console.log(`   ⚠️  Errors encountered: ${result.errors.length}`);
    }

    return result;

  } catch (error) {
    console.error('❌ Fatal error during compliance check:', error);
    result.errors.push(
      error instanceof Error ? error.message : 'Unknown fatal error'
    );
    return result;
  }
}

/**
 * Find all M365 settings that are affected by the changed policies
 */
async function findAffectedSettings(changedPolicyIds: number[]) {
  const policies = await prisma.m365Policy.findMany({
    where: { id: { in: changedPolicyIds } },
    select: { policyType: true },
  });

  const policyTypes = [...new Set(policies.map(p => p.policyType))];

  return await prisma.m365Setting.findMany({
    where: { policyType: { in: policyTypes } },
    include: {
      controlMappings: {
        include: {
          control: { select: { id: true } },
        },
      },
    },
  });
}

/**
 * Get current compliance state for a set of controls
 */
async function getControlComplianceState(controlIds: number[]) {
  const summaries = await prisma.controlM365Compliance.findMany({
    where: { controlId: { in: controlIds } },
    select: {
      controlId: true,
      compliancePercentage: true,
      compliantSettings: true,
      nonCompliantSettings: true,
    },
  });

  return new Map(
    summaries.map(s => [
      s.controlId,
      {
        compliance: s.compliancePercentage,
        compliant: s.compliantSettings,
        nonCompliant: s.nonCompliantSettings,
      },
    ])
  );
}

/**
 * Compare before/after compliance states to detect improvements/declines
 */
function compareComplianceStates(
  before: Map<number, any>,
  after: Map<number, any>
): { improved: number; declined: number } {
  let improved = 0;
  let declined = 0;

  for (const [controlId, afterState] of after.entries()) {
    const beforeState = before.get(controlId);

    if (!beforeState) continue;

    const beforeCompliance = beforeState.compliance || 0;
    const afterCompliance = afterState.compliance || 0;

    if (afterCompliance > beforeCompliance + 0.01) {
      // Improved by more than 1%
      improved++;
    } else if (afterCompliance < beforeCompliance - 0.01) {
      // Declined by more than 1%
      declined++;
    }
  }

  return { improved, declined };
}

/**
 * Update the sync log with compliance check results
 */
export async function updateSyncLogWithCompliance(
  syncLogId: number,
  result: ComplianceCheckResult
): Promise<void> {
  await prisma.m365SyncLog.update({
    where: { id: syncLogId },
    data: {
      complianceChecked: true,
      settingsValidated: result.settingsValidated,
      complianceImproved: result.complianceImproved,
      complianceDeclined: result.complianceDeclined,
      controlsAffected: result.controlsAffected,
      complianceErrors: result.errors.length > 0
        ? JSON.stringify(result.errors)
        : null,
    },
  });
}

/**
 * Check if a policy has actually changed by comparing JSON data
 * This prevents unnecessary compliance recalculation
 */
export function hasPolicyChanged(
  existingPolicyData: any,
  newPolicyData: any
): boolean {
  // Normalize both objects for comparison
  const normalize = (obj: any) => JSON.stringify(obj, Object.keys(obj).sort());

  return normalize(existingPolicyData) !== normalize(newPolicyData);
}

/**
 * Filter out policies that haven't actually changed
 * Returns only the IDs of policies with real changes
 */
export async function getActuallyChangedPolicies(
  potentiallyChangedIds: number[]
): Promise<number[]> {
  const changedIds: number[] = [];

  for (const policyId of potentiallyChangedIds) {
    const policy = await prisma.m365Policy.findUnique({
      where: { id: policyId },
      select: {
        policyData: true,
        updatedAt: true,
      },
    });

    // If policy was just created or we can't verify, include it
    if (!policy) {
      changedIds.push(policyId);
      continue;
    }

    // Check if updated in the last 5 minutes (likely just synced)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (policy.updatedAt > fiveMinutesAgo) {
      changedIds.push(policyId);
    }
  }

  return changedIds;
}
