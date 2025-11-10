import dotenv from 'dotenv';
dotenv.config();

import { policySyncService } from '../services/policySync.service';

async function testSync() {
  console.log('🔄 Testing Policy Sync...\n');

  try {
    // Trigger sync
    console.log('Starting sync...');
    const result = await policySyncService.syncAllPolicies(true);

    console.log('\n📊 Sync Result:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Policies Updated: ${result.policiesUpdated}`);
    console.log(`  Controls Updated: ${result.controlsUpdated}`);
    console.log(`  Duration: ${result.duration}ms`);

    if (result.errors && result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.join(', ')}`);
    }

    // Get stats
    console.log('\n📈 Integration Stats:');
    const stats = await policySyncService.getIntegrationStats();
    console.log(`  Total Policies: ${stats.totalPolicies}`);
    console.log(`  Active Policies: ${stats.activePolicies}`);
    console.log(`  Mapped Controls: ${stats.mappedControls}`);
    console.log('  Breakdown:');
    console.log(`    Intune: ${stats.policyBreakdown.Intune}`);
    console.log(`    Purview: ${stats.policyBreakdown.Purview}`);
    console.log(`    Azure AD: ${stats.policyBreakdown.AzureAD}`);

    console.log('\n🎉 Sync test completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Sync test failed:', error);
    process.exit(1);
  }
}

testSync();
