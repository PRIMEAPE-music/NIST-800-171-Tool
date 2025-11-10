import dotenv from 'dotenv';
dotenv.config();

import { intuneService } from '../services/intune.service';
import { purviewService } from '../services/purview.service';
import { azureADService } from '../services/azureAD.service';

async function testM365Services() {
  console.log('🔬 Testing M365 Services...\n');

  try {
    // Test Intune
    console.log('📱 Testing Intune Service...');
    const intuneData = await intuneService.getAllPolicies();
    console.log(`  ✅ Compliance Policies: ${intuneData.compliancePolicies.length}`);
    console.log(`  ✅ Configuration Policies: ${intuneData.configurationPolicies.length}`);
    console.log(`  ✅ Managed Devices: ${intuneData.deviceCount}\n`);

    // Test Purview
    console.log('🛡️  Testing Purview Service...');
    const purviewData = await purviewService.getInformationProtectionSummary();
    console.log(`  ✅ Sensitivity Labels: ${purviewData.sensitivityLabelsCount}`);
    console.log(`  ✅ Is Configured: ${purviewData.isConfigured}\n`);

    // Test Azure AD
    console.log('🔐 Testing Azure AD Service...');
    const azureADData = await azureADService.getSecuritySummary();
    console.log(`  ✅ Conditional Access Policies: ${azureADData.conditionalAccessPolicies.length}`);
    console.log(`  ✅ MFA Enabled: ${azureADData.mfaStatus.enabled}`);
    console.log(`  ✅ Security Defaults: ${azureADData.securityDefaultsEnabled}\n`);

    console.log('🎉 All M365 services tested successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testM365Services();
