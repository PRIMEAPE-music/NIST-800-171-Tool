/**
 * Test script for backend service keyword-based search
 * Run this after starting the backend server
 */

const testControls = [
  '03.01.01', // Account Management
  '03.05.07', // Security Patches
  '03.07.11', // Authenticator Management
  '03.13.11', // Encrypt CUI at Rest
];

console.log('\n🧪 Testing Backend Service - Keyword-Based Settings Search\n');
console.log('='.repeat(70));

async function testControlSettings(controlId) {
  try {
    const response = await fetch(`http://localhost:3001/api/controls/${controlId}/settings`);

    if (!response.ok) {
      console.log(`\n❌ ${controlId}: HTTP ${response.status} ${response.statusText}`);
      return;
    }

    const result = await response.json();

    console.log(`\n✅ ${controlId}: ${result.controlTitle || 'Unknown'}`);
    console.log(`   Priority: ${result.priority || 'N/A'}`);
    console.log(`   Has Settings: ${result.hasSettings}`);
    console.log(`   Total Mappings: ${result.totalMappings || 0}`);

    if (result.validationResults && result.validationResults.length > 0) {
      result.validationResults.forEach((mapping) => {
        console.log(`\n   📋 ${mapping.description}`);
        console.log(`      Settings Found: ${mapping.settingsFound}`);

        if (mapping.results && mapping.results.length > 0) {
          mapping.results.slice(0, 2).forEach((setting) => {
            const icon = setting.isCompliant ? '✓' : '✗';
            console.log(`      ${icon} ${setting.policyName}`);
            console.log(`        ${setting.settingName} = ${JSON.stringify(setting.settingValue)}`);
            console.log(`        ${setting.validationMessage}`);
          });

          if (mapping.results.length > 2) {
            console.log(`      ... and ${mapping.results.length - 2} more`);
          }
        }
      });
    }
  } catch (error) {
    console.log(`\n❌ ${controlId}: ${error.message}`);
    if (error.message.includes('fetch')) {
      console.log('   💡 Make sure the backend server is running (npm run dev in server folder)');
    }
  }
}

async function runTests() {
  console.log('\nℹ️  Testing endpoint: http://localhost:3001/api/controls/{id}/settings');
  console.log('ℹ️  Make sure backend server is running before running this test\n');

  for (const controlId of testControls) {
    await testControlSettings(controlId);
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Test Complete!\n');
  console.log('Note: If you see "No settings found", this is normal if you haven\'t');
  console.log('synced M365 policies yet. Run a policy sync from the Settings page.\n');
}

runTests().catch(console.error);
