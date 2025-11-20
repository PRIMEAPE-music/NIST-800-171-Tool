import dotenv from 'dotenv';
dotenv.config();

import { azureADService } from '../services/azureAD.service';

async function testPIM() {
  console.log('🧪 Testing PIM Policy Retrieval\n');

  try {
    // Test PIM Policies API
    console.log('1️⃣ Fetching PIM Role Management Policies...');
    const pimPolicies = await azureADService.getPIMRoleManagementPolicies();
    console.log(`   Result: Found ${pimPolicies.length} PIM policies`);

    if (pimPolicies.length > 0) {
      console.log('\n   Sample PIM Policy:');
      const sample = pimPolicies[0];
      console.log(`   - ID: ${sample.id}`);
      console.log(`   - Display Name: ${sample.displayName || 'N/A'}`);
      console.log(`   - Scope Type: ${sample.scopeType}`);
      console.log(`   - Scope ID: ${sample.scopeId}`);
      console.log(`   - Is Organization Default: ${sample.isOrganizationDefault}`);

      // Show rule count if available
      if (sample.rules) {
        console.log(`   - Rules Count: ${sample.rules.length}`);
      }
    } else {
      console.log('   ⚠️  No PIM policies found (or permissions missing)');
      console.log('   Note: PIM requires Azure AD Premium P2 license');
    }

    // Test PIM Assignments API (optional)
    console.log('\n2️⃣ Fetching PIM Role Assignments...');
    const pimAssignments = await azureADService.getPIMRoleAssignments();
    console.log(`   Result: Found ${pimAssignments.length} active PIM assignments`);

    if (pimAssignments.length > 0) {
      console.log('\n   Sample PIM Assignment:');
      const sample = pimAssignments[0];
      console.log(`   - ID: ${sample.id}`);
      console.log(`   - Role ID: ${sample.roleDefinitionId}`);
      console.log(`   - Principal ID: ${sample.principalId}`);
      console.log(`   - Status: ${sample.assignmentType}`);
    }

    // Test full security summary
    console.log('\n3️⃣ Fetching Azure AD Security Summary...');
    const summary = await azureADService.getSecuritySummary();
    console.log(`   Conditional Access Policies: ${summary.conditionalAccessPolicies.length}`);
    console.log(`   PIM Policies: ${summary.pimPolicies.length}`);
    console.log(`   PIM Assignments: ${summary.pimAssignments.length}`);
    console.log(`   MFA Enabled: ${summary.mfaStatus.enabled}`);
    console.log(`   Security Defaults: ${summary.securityDefaultsEnabled}`);

    console.log('\n✅ PIM test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ PIM test failed:', error);
    process.exit(1);
  }
}

testPIM();
