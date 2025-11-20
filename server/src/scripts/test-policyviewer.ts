import policyViewerService from '../services/policyViewer.service';

async function test() {
  console.log('\n=== TESTING POLICY VIEWER SERVICE ===\n');

  try {
    const policies = await policyViewerService.getPolicies({ policyType: 'Intune' });

    console.log(`Found ${policies.length} Intune policies\n`);

    for (const policy of policies.slice(0, 3)) {
      console.log(`📋 ${policy.policyName}`);
      console.log(`   Controls: ${policy.mappedControls.length}`);

      if (policy.mappedControls.length > 0) {
        console.log(`   Sample controls:`);
        policy.mappedControls.slice(0, 3).forEach(c => {
          console.log(`     - ${c.controlId}: ${c.controlTitle.substring(0, 40)}`);
        });
      }
      console.log();
    }

    const totalControls = new Set();
    policies.forEach(p => {
      p.mappedControls.forEach(c => totalControls.add(c.controlId));
    });

    console.log(`\nTotal unique controls across all Intune policies: ${totalControls.size}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

test();
