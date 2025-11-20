import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { azureADService } from '../services/azureAD.service';
import { intuneService } from '../services/intune.service';

const prisma = new PrismaClient();

async function testPhase4() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 4: ATTACK SIMULATION & DEFENDER ATP TEST');
  console.log('='.repeat(70) + '\n');

  try {
    // Test 1: Attack Simulation API
    console.log('📋 Test 1: Fetching Attack Simulations from API...');
    const simulations = await azureADService.getAttackSimulations();
    console.log(`✅ Attack Simulations: ${simulations.length}`);

    if (simulations.length > 0) {
      simulations.forEach((sim: any) => {
        console.log(`   - ${sim.displayName} (${sim.status})`);
      });
    } else {
      console.log('   ℹ️  No attack simulations configured (normal if not using Defender for Office 365)');
    }
    console.log();

    // Test 2: Attack Simulation Automations
    console.log('📋 Test 2: Fetching Attack Simulation Automations...');
    const automations = await azureADService.getAttackSimulationAutomations();
    console.log(`✅ Attack Simulation Automations: ${automations.length}`);

    if (automations.length > 0) {
      automations.forEach((auto: any) => {
        console.log(`   - ${auto.displayName} (${auto.status})`);
      });
    }
    console.log();

    // Test 3: Defender ATP
    console.log('📋 Test 3: Checking Defender ATP Configuration...');
    const configPolicies = await intuneService.getDeviceConfigurationPolicies();
    const defenderATP = configPolicies.filter(
      (p: any) =>
        p['@odata.type'] === '#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration'
    );
    console.log(`✅ Defender ATP policies: ${defenderATP.length}`);

    if (defenderATP.length > 0) {
      defenderATP.forEach((p: any) => {
        console.log(`   - ${p.displayName}`);
      });
    } else {
      console.log('   ℹ️  No Defender ATP configuration found (requires Defender for Endpoint license)');
    }
    console.log();

    // Test 4: Database check
    console.log('📋 Test 4: Checking Database for Attack Simulation Policies...');
    const attackSimInDb = await prisma.m365Policy.count({
      where: {
        odataType: {
          contains: 'attackSimulation',
        },
      },
    });
    console.log(`✅ Attack Simulation policies in DB: ${attackSimInDb}`);
    console.log();

    // Test 5: Settings coverage
    console.log('📋 Test 5: Checking Settings Coverage...');
    const attackSimSettings = await prisma.m365Setting.count({
      where: {
        policyTemplate: {
          contains: 'attackSimulation',
        },
      },
    });
    const defenderATPSettings = await prisma.m365Setting.count({
      where: {
        policyTemplate: '#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration',
      },
    });

    console.log(`✅ Attack Simulation settings: ${attackSimSettings}`);
    console.log(`✅ Defender ATP settings: ${defenderATPSettings}`);
    console.log(`   Total Phase 4 settings: ${attackSimSettings + defenderATPSettings}`);

    console.log();
    console.log('='.repeat(70));
    console.log('✅ PHASE 4 TEST COMPLETED');
    console.log('='.repeat(70));

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testPhase4();
