import { PrismaClient } from '@prisma/client';
import { intuneService } from '../services/intune.service';
import { purviewService } from '../services/purview.service';
import { azureADService } from '../services/azureAD.service';

const prisma = new PrismaClient();

async function diagnoseSyncIssues() {
  console.log('\n🔍 Diagnosing M365 Sync Issues\n');

  // Check latest sync log
  const latestSync = await prisma.m365SyncLog.findFirst({
    orderBy: { syncDate: 'desc' },
  });

  if (latestSync) {
    console.log('📋 Latest Sync Log:');
    console.log(`   Date: ${latestSync.syncDate}`);
    console.log(`   Status: ${latestSync.status}`);
    console.log(`   Policies Updated: ${latestSync.policiesUpdated}`);
    console.log(`   Controls Updated: ${latestSync.controlsUpdated}`);
    if (latestSync.errorMessage) {
      console.log(`   Errors: ${latestSync.errorMessage}`);
    }
  }

  console.log('\n\n🔌 Testing M365 Service Connections:\n');

  // Test Intune
  console.log('1️⃣ Testing Intune Service...');
  try {
    const intuneData = await intuneService.getAllPolicies();
    console.log(`   ✅ Intune: ${intuneData.compliancePolicies.length} compliance policies`);
    console.log(`   ✅ Intune: ${intuneData.configurationPolicies.length} configuration policies`);
    console.log(`   Total Intune policies that should sync: ${intuneData.compliancePolicies.length + intuneData.configurationPolicies.length}`);

    if (intuneData.compliancePolicies.length > 0) {
      console.log('\n   Sample compliance policy:');
      const sample = intuneData.compliancePolicies[0];
      console.log(`   - ID: ${sample.id}`);
      console.log(`   - Name: ${sample.displayName}`);
      console.log(`   - Description: ${sample.description || 'N/A'}`);
    }

    if (intuneData.configurationPolicies.length > 0) {
      console.log('\n   Sample configuration policy:');
      const sample = intuneData.configurationPolicies[0];
      console.log(`   - ID: ${sample.id}`);
      console.log(`   - Name: ${sample.displayName}`);
      console.log(`   - Description: ${sample.description || 'N/A'}`);
    }
  } catch (error) {
    console.log(`   ❌ Intune Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test Purview
  console.log('\n2️⃣ Testing Purview Service...');
  try {
    const purviewData = await purviewService.getInformationProtectionSummary();
    console.log(`   ✅ Purview: ${purviewData.labels.length} sensitivity labels`);
    console.log(`   Total Purview policies that should sync: ${purviewData.labels.length}`);

    if (purviewData.labels.length > 0) {
      console.log('\n   Sample label:');
      const sample = purviewData.labels[0];
      console.log(`   - ID: ${sample.id}`);
      console.log(`   - Name: ${sample.name}`);
      console.log(`   - Description: ${sample.description || 'N/A'}`);
    }
  } catch (error) {
    console.log(`   ❌ Purview Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test Azure AD
  console.log('\n3️⃣ Testing Azure AD Service...');
  try {
    const azureADData = await azureADService.getSecuritySummary();
    console.log(`   ✅ Azure AD: ${azureADData.conditionalAccessPolicies.length} conditional access policies`);
    console.log(`   Total Azure AD policies that should sync: ${azureADData.conditionalAccessPolicies.length}`);

    if (azureADData.conditionalAccessPolicies.length > 0) {
      console.log('\n   Sample conditional access policy:');
      const sample = azureADData.conditionalAccessPolicies[0];
      console.log(`   - ID: ${sample.id}`);
      console.log(`   - Name: ${sample.displayName}`);
      console.log(`   - State: ${sample.state}`);
    }
  } catch (error) {
    console.log(`   ❌ Azure AD Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check what's in database
  console.log('\n\n💾 Policies Currently in Database:\n');
  const dbPolicies = await prisma.m365Policy.findMany();
  console.log(`   Total: ${dbPolicies.length} policies`);

  const byType = dbPolicies.reduce((acc, p) => {
    acc[p.policyType] = (acc[p.policyType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n   Breakdown by type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   - ${type}: ${count}`);
  });

  console.log('\n   All policies:');
  dbPolicies.forEach(p => {
    console.log(`   - [${p.policyType}] ${p.policyName}`);
  });

  await prisma.$disconnect();
}

diagnoseSyncIssues().catch(console.error);
