import { intuneService } from '../services/intune.service';

async function testEnhancedSync() {
  console.log('\n🔍 Testing Enhanced Intune Sync\n');

  try {
    const data = await intuneService.getAllPolicies();

    console.log('📊 Policy Counts by Type:\n');
    console.log(`   Compliance Policies: ${data.compliancePolicies.length}`);
    console.log(`   Configuration Policies (legacy): ${data.configurationPolicies.length}`);
    console.log(`   Settings Catalog Policies: ${data.settingsCatalogPolicies.length}`);
    console.log(`   Endpoint Security Policies: ${data.endpointSecurityPolicies.length}`);
    console.log(`   App Protection Policies: ${data.appProtectionPolicies.length}`);
    console.log(`   Enrollment Restrictions: ${data.enrollmentRestrictions.length}`);

    const totalPolicies =
      data.compliancePolicies.length +
      data.configurationPolicies.length +
      data.settingsCatalogPolicies.length +
      data.endpointSecurityPolicies.length +
      data.appProtectionPolicies.length;

    console.log(`\n   📌 TOTAL POLICIES THAT WILL BE SYNCED: ${totalPolicies}`);

    // Show sample configuration policies with their types
    if (data.configurationPolicies.length > 0) {
      console.log('\n📋 Sample Legacy Configuration Policies:');
      data.configurationPolicies.slice(0, 3).forEach((p: any) => {
        const odataType = p['@odata.type'] || 'Unknown';
        console.log(`   - ${p.displayName}`);
        console.log(`     Type: ${odataType}`);
      });
    }

    if (data.settingsCatalogPolicies.length > 0) {
      console.log('\n🔧 Sample Settings Catalog Policies:');
      data.settingsCatalogPolicies.slice(0, 5).forEach((p: any) => {
        console.log(`   - ${p.name || p.displayName}`);
      });
    }

    if (data.endpointSecurityPolicies.length > 0) {
      console.log('\n🔒 Sample Endpoint Security Policies:');
      data.endpointSecurityPolicies.slice(0, 5).forEach((p: any) => {
        console.log(`   - ${p.displayName || p.name}`);
      });
    }

    if (data.appProtectionPolicies.length > 0) {
      console.log('\n📱 Sample App Protection Policies:');
      data.appProtectionPolicies.slice(0, 3).forEach(p => {
        console.log(`   - ${p.displayName || p.name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testEnhancedSync();
