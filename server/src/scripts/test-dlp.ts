import dotenv from 'dotenv';
dotenv.config();

import { purviewService } from '../services/purview.service';

async function testDLP() {
  console.log('🧪 Testing DLP Policy Retrieval\n');

  try {
    // Test DLP API
    console.log('1️⃣ Fetching DLP policies...');
    const dlpPolicies = await purviewService.getDLPPolicies();
    console.log(`   Result: Found ${dlpPolicies.length} DLP policies`);

    if (dlpPolicies.length > 0) {
      console.log('\n   Sample DLP Policy:');
      const sample = dlpPolicies[0];
      console.log(`   - ID: ${sample.id}`);
      console.log(`   - Name: ${sample.name || sample.displayName}`);
      console.log(`   - Mode: ${sample.mode}`);
      console.log(`   - Description: ${sample.description || 'N/A'}`);
    } else {
      console.log('   ⚠️  No DLP policies found (or permissions missing)');
    }

    // Test full summary
    console.log('\n2️⃣ Fetching Information Protection Summary...');
    const summary = await purviewService.getInformationProtectionSummary();
    console.log(`   Sensitivity Labels: ${summary.sensitivityLabelsCount}`);
    console.log(`   DLP Policies: ${summary.dlpPolicies.length}`);
    console.log(`   Is Configured: ${summary.isConfigured}`);

    console.log('\n✅ DLP test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ DLP test failed:', error);
    process.exit(1);
  }
}

testDLP();
