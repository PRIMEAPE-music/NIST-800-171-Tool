import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { azureADService } from '../services/azureAD.service';
import { intuneService } from '../services/intune.service';

const prisma = new PrismaClient();

async function testPhase3() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 3: AUTHORIZATION POLICY & WINDOWS CUSTOM CONFIG TEST');
  console.log('='.repeat(70) + '\n');

  try {
    // Test 1: Authorization Policy API
    console.log('Test 1: Fetching Authorization Policy from API...');
    const authPolicy = await azureADService.getAuthorizationPolicy();

    if (authPolicy) {
      console.log('Authorization Policy retrieved');
      console.log(`   ID: ${authPolicy.id}`);
      console.log(`   Display Name: ${authPolicy.displayName || 'N/A'}`);
      console.log(`   Guest invites from: ${authPolicy.allowInvitesFrom || 'Default'}`);
      console.log(`   Block MSOL PowerShell: ${authPolicy.blockMsolPowerShell}`);
      console.log(`   Default user role permissions:`);
      console.log(`     - Create apps: ${authPolicy.defaultUserRolePermissions?.allowedToCreateApps}`);
      console.log(`     - Create security groups: ${authPolicy.defaultUserRolePermissions?.allowedToCreateSecurityGroups}`);
      console.log(`     - Read other users: ${authPolicy.defaultUserRolePermissions?.allowedToReadOtherUsers}`);
    } else {
      console.log('Could not retrieve Authorization Policy');
      console.log('   Check permissions and error messages above');
    }

    console.log();

    // Test 2: Windows Custom Configuration
    console.log('Test 2: Checking Windows Custom Configuration Policies...');
    const configPolicies = await intuneService.getDeviceConfigurationPolicies();
    const windowsCustom = configPolicies.filter((p: any) =>
      p['@odata.type'] === '#microsoft.graph.windows10CustomConfiguration'
    );

    console.log(`Total configuration policies: ${configPolicies.length}`);
    console.log(`   Windows Custom Configuration: ${windowsCustom.length}`);

    if (windowsCustom.length > 0) {
      console.log('   Found custom config policies:');
      windowsCustom.forEach((p: any) => {
        console.log(`     - ${p.displayName}`);
      });
    } else {
      console.log('   No Windows Custom Configuration policies in tenant (this is normal)');
    }

    console.log();

    // Test 3: Check database for Authorization Policy
    console.log('Test 3: Checking Database for Authorization Policy...');
    const authPolicyInDb = await prisma.m365Policy.findFirst({
      where: {
        odataType: '#microsoft.graph.authorizationPolicy'
      }
    });

    if (authPolicyInDb) {
      console.log('Authorization Policy found in database');
      console.log(`   Policy Name: ${authPolicyInDb.policyName}`);
      console.log(`   Last Synced: ${authPolicyInDb.lastSynced}`);
      console.log(`   Active: ${authPolicyInDb.isActive}`);
    } else {
      console.log('Authorization Policy not yet in database');
      console.log('   Run policy sync to import it');
    }

    console.log();

    // Test 4: Check settings coverage
    console.log('Test 4: Checking Settings Coverage...');

    const authPolicySettings = await prisma.m365Setting.count({
      where: {
        policyTemplate: '#microsoft.graph.authorizationPolicy'
      }
    });

    const windowsCustomSettings = await prisma.m365Setting.count({
      where: {
        policyTemplate: '#microsoft.graph.windows10CustomConfiguration'
      }
    });

    console.log(`Authorization Policy settings in catalog: ${authPolicySettings}`);
    console.log(`Windows Custom Config settings in catalog: ${windowsCustomSettings}`);
    console.log(`   Total Phase 3 settings: ${authPolicySettings + windowsCustomSettings}`);

    console.log();

    // Test 5: Overall compliance impact
    console.log('Test 5: Estimating Compliance Impact...');

    const totalSettings = await prisma.m365Setting.count();
    const settingsWithChecks = await prisma.m365Setting.count({
      where: {
        complianceChecks: {
          some: {}
        }
      }
    });

    const phase3Settings = authPolicySettings + windowsCustomSettings;
    const estimatedAfter = settingsWithChecks + phase3Settings;
    const currentPercentage = ((settingsWithChecks / totalSettings) * 100).toFixed(1);
    const estimatedPercentage = ((estimatedAfter / totalSettings) * 100).toFixed(1);

    console.log(`   Current: ${settingsWithChecks}/${totalSettings} (${currentPercentage}%)`);
    console.log(`   After Phase 3: ~${estimatedAfter}/${totalSettings} (~${estimatedPercentage}%)`);
    console.log(`   Estimated improvement: ~${(parseFloat(estimatedPercentage) - parseFloat(currentPercentage)).toFixed(1)}%`);

    console.log();
    console.log('='.repeat(70));
    console.log('PHASE 3 TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));

    await prisma.$disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\nTest failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testPhase3();
