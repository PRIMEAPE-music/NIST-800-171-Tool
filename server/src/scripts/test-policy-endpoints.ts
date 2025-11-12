import { graphClientService } from '../services/graphClient.service';

async function testPolicyEndpoints() {
  console.log('\n🔍 Testing All Policy Endpoints\n');

  const endpoints = [
    { name: 'Compliance Policies', url: '/deviceManagement/deviceCompliancePolicies' },
    { name: 'Configuration Policies (Legacy)', url: '/deviceManagement/deviceConfigurations' },
    { name: 'Settings Catalog Policies', url: '/deviceManagement/configurationPolicies' },
    { name: 'Endpoint Security Policies (Intents)', url: '/deviceManagement/intents' },
    { name: 'iOS App Protection', url: '/deviceAppManagement/iosManagedAppProtections' },
    { name: 'Android App Protection', url: '/deviceAppManagement/androidManagedAppProtections' },
    { name: 'Windows App Protection', url: '/deviceAppManagement/windowsManagedAppProtections' },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n📋 Testing: ${endpoint.name}`);
      console.log(`   URL: ${endpoint.url}`);

      const response = await graphClientService.get<{ value: any[] }>(endpoint.url);

      console.log(`   ✅ SUCCESS: Found ${response.value.length} policies`);

      if (response.value.length > 0) {
        const sample = response.value[0];
        console.log(`   Sample policy:`);
        console.log(`   - ID: ${sample.id}`);
        console.log(`   - Name: ${sample.displayName || sample.name || 'N/A'}`);
        console.log(`   - Type: ${sample['@odata.type'] || 'N/A'}`);
      }
    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message || error}`);
      if (error.statusCode) {
        console.log(`   Status Code: ${error.statusCode}`);
      }
    }
  }

  console.log('\n\n✅ Endpoint Testing Complete!\n');
}

testPolicyEndpoints().catch(console.error);
