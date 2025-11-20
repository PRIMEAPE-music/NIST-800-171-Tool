import { PrismaClient } from '@prisma/client';
import { intuneService } from '../services/intune.service';
import { purviewService } from '../services/purview.service';
import { azureADService } from '../services/azureAD.service';

const prisma = new PrismaClient();

async function comprehensiveValidation() {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE VALIDATION - NIST 800-171 COMPLIANCE APPLICATION');
  console.log('='.repeat(80) + '\n');

  const results: any = {
    timestamp: new Date().toISOString(),
    phases: {},
    database: {},
    api: {},
    compliance: {},
    errors: [],
  };

  try {
    // =============================================================================
    // PHASE 1: DATABASE VALIDATION
    // =============================================================================
    console.log('📊 PHASE 1: DATABASE VALIDATION');
    console.log('='.repeat(80) + '\n');

    // Total settings
    const totalSettings = await prisma.m365Setting.count();
    console.log(`✅ Total M365 Settings: ${totalSettings}`);
    results.database.totalSettings = totalSettings;

    // Settings with checks (complianceChecks is a relation, so we check for at least one)
    const settingsWithChecks = await prisma.m365Setting.count({
      where: { complianceChecks: { some: {} } },
    });
    const coveragePercentage = ((settingsWithChecks / totalSettings) * 100).toFixed(1);
    console.log(`✅ Settings with compliance checks: ${settingsWithChecks} (${coveragePercentage}%)`);
    results.database.settingsWithChecks = settingsWithChecks;
    results.database.coveragePercentage = parseFloat(coveragePercentage);

    // Settings without checks (unmatched)
    const unmatchedSettings = totalSettings - settingsWithChecks;
    console.log(`⚠️  Unmatched settings: ${unmatchedSettings}\n`);
    results.database.unmatchedSettings = unmatchedSettings;

    // Total policies
    const totalPolicies = await prisma.m365Policy.count();
    console.log(`✅ Total M365 Policies: ${totalPolicies}`);
    results.database.totalPolicies = totalPolicies;

    // Active policies
    const activePolicies = await prisma.m365Policy.count({
      where: { isActive: true },
    });
    console.log(`✅ Active policies: ${activePolicies}\n`);
    results.database.activePolicies = activePolicies;

    // Policies by type
    const policiesByType = await prisma.m365Policy.groupBy({
      by: ['policyType'],
      _count: { id: true },
    });
    console.log('Policies by source:');
    policiesByType.forEach(p => {
      console.log(`  - ${p.policyType}: ${p._count.id}`);
      results.database[`${p.policyType}Policies`] = p._count.id;
    });
    console.log();

    // Policies by template family
    const policiesByFamily = await prisma.m365Policy.groupBy({
      by: ['templateFamily'],
      _count: { id: true },
    });
    console.log('Policies by template family:');
    policiesByFamily.forEach(p => {
      console.log(`  - ${p.templateFamily || 'Unknown'}: ${p._count.id}`);
    });
    console.log();

    // NULL template check
    const nullTemplates = await prisma.m365Setting.count({
      where: { policyTemplate: null },
    });
    if (nullTemplates > 0) {
      console.log(`⚠️  Settings with NULL templates: ${nullTemplates}`);
      results.errors.push(`${nullTemplates} settings have NULL templates`);
    } else {
      console.log(`✅ No NULL templates`);
    }
    console.log();

    // =============================================================================
    // PHASE 2: API CONNECTIVITY VALIDATION
    // =============================================================================
    console.log('🌐 PHASE 2: API CONNECTIVITY VALIDATION');
    console.log('='.repeat(80) + '\n');

    // Intune
    console.log('Testing Intune API...');
    try {
      const intuneData = await intuneService.getAllPolicies();
      console.log(`✅ Intune: ${intuneData.compliancePolicies.length} compliance + ${intuneData.configurationPolicies.length} config policies`);
      results.api.intune = 'Connected';
      results.api.intuneCompliancePolicies = intuneData.compliancePolicies.length;
      results.api.intuneConfigPolicies = intuneData.configurationPolicies.length;
    } catch (error: any) {
      console.log(`❌ Intune: ${error.message}`);
      results.api.intune = `Error: ${error.message}`;
      results.errors.push(`Intune API: ${error.message}`);
    }

    // Purview
    console.log('Testing Purview API...');
    try {
      const purviewData = await purviewService.getInformationProtectionSummary();
      console.log(`✅ Purview: ${purviewData.sensitivityLabelsCount} labels + ${purviewData.dlpPolicies?.length || 0} DLP policies`);
      results.api.purview = 'Connected';
      results.api.purviewLabels = purviewData.sensitivityLabelsCount;
      results.api.purviewDLP = purviewData.dlpPolicies?.length || 0;
    } catch (error: any) {
      console.log(`❌ Purview: ${error.message}`);
      results.api.purview = `Error: ${error.message}`;
      results.errors.push(`Purview API: ${error.message}`);
    }

    // Azure AD
    console.log('Testing Azure AD API...');
    try {
      const azureADData = await azureADService.getSecuritySummary();
      console.log(`✅ Azure AD: ${azureADData.conditionalAccessPolicies.length} CA policies`);
      results.api.azureAD = 'Connected';
      results.api.azureADCAPolicies = azureADData.conditionalAccessPolicies.length;
    } catch (error: any) {
      console.log(`❌ Azure AD: ${error.message}`);
      results.api.azureAD = `Error: ${error.message}`;
      results.errors.push(`Azure AD API: ${error.message}`);
    }
    console.log();

    // =============================================================================
    // PHASE 3: POLICY TYPE VALIDATION
    // =============================================================================
    console.log('🔍 PHASE 3: POLICY TYPE VALIDATION');
    console.log('='.repeat(80) + '\n');

    const policyTypeChecks = [
      { name: 'DLP Policies', odataType: 'dataLossPreventionPolicy', phase: 'Phase 1' },
      { name: 'PIM Policies', odataType: 'privilegedIdentityManagement', phase: 'Phase 2' },
      { name: 'Authorization Policy', odataType: 'authorizationPolicy', phase: 'Phase 3' },
      { name: 'Windows Custom Config', odataType: 'windows10CustomConfiguration', phase: 'Phase 3' },
      { name: 'Attack Simulation', odataType: 'attackSimulation', phase: 'Phase 4' },
      { name: 'Defender ATP', odataType: 'windowsDefenderAdvancedThreatProtection', phase: 'Phase 4' },
    ];

    for (const check of policyTypeChecks) {
      const count = await prisma.m365Policy.count({
        where: {
          odataType: { contains: check.odataType },
        },
      });

      if (count > 0) {
        console.log(`✅ ${check.name}: ${count} policies (${check.phase})`);
        results.phases[check.phase] = results.phases[check.phase] || {};
        results.phases[check.phase][check.name] = count;
      } else {
        console.log(`⚠️  ${check.name}: 0 policies (${check.phase} - may not be configured)`);
        results.phases[check.phase] = results.phases[check.phase] || {};
        results.phases[check.phase][check.name] = 0;
      }
    }
    console.log();

    // =============================================================================
    // PHASE 4: COMPLIANCE METRICS
    // =============================================================================
    console.log('📈 PHASE 4: COMPLIANCE METRICS');
    console.log('='.repeat(80) + '\n');

    // Controls summary
    const totalControls = await prisma.control.count();
    const controlsWithSettings = await prisma.controlM365Compliance.count();
    console.log(`✅ Total NIST controls: ${totalControls}`);
    console.log(`✅ Controls with compliance data: ${controlsWithSettings}\n`);
    results.compliance.totalControls = totalControls;
    results.compliance.controlsWithData = controlsWithSettings;

    // Average compliance by family
    const familyCompliance = await prisma.$queryRaw<Array<{
      controlFamily: string;
      avg_compliance: number;
      control_count: number;
    }>>`
      SELECT
        c.family as controlFamily,
        AVG(cm.compliance_percentage) as avg_compliance,
        COUNT(*) as control_count
      FROM controls c
      INNER JOIN control_m365_compliance cm ON c.id = cm.control_id
      GROUP BY c.family
      ORDER BY avg_compliance DESC
    `;

    console.log('Compliance by control family:');
    familyCompliance.forEach(f => {
      console.log(`  - ${f.controlFamily}: ${f.avg_compliance.toFixed(1)}% (${f.control_count} controls)`);
    });
    results.compliance.byFamily = familyCompliance;
    console.log();

    // =============================================================================
    // PHASE 5: DATA QUALITY CHECKS
    // =============================================================================
    console.log('🔧 PHASE 5: DATA QUALITY CHECKS');
    console.log('='.repeat(80) + '\n');

    // Check for common data quality issues
    const qualityChecks = [
      {
        name: 'Settings with NULL templates',
        query: { policyTemplate: null },
      },
      {
        name: 'Windows settings with iOS templates',
        query: {
          AND: [
            {
              OR: [
                { settingName: { contains: 'Windows', mode: 'insensitive' as const } },
                { platform: 'Windows' },
              ],
            },
            { policyTemplate: { contains: 'ios', mode: 'insensitive' as const } },
          ],
        },
      },
      {
        name: 'Settings with no compliance checks',
        query: { complianceChecks: { none: {} } },
      },
    ];

    for (const check of qualityChecks) {
      const count = await prisma.m365Setting.count({
        where: check.query as any,
      });

      if (count > 0) {
        console.log(`⚠️  ${check.name}: ${count}`);
        results.errors.push(`${check.name}: ${count}`);
      } else {
        console.log(`✅ ${check.name}: 0`);
      }
    }
    console.log();

    // =============================================================================
    // FINAL SUMMARY
    // =============================================================================
    console.log('📋 FINAL SUMMARY');
    console.log('='.repeat(80) + '\n');

    const passedValidation = results.errors.length === 0 && parseFloat(coveragePercentage) >= 90;

    if (passedValidation) {
      console.log('🎉 ✅ VALIDATION PASSED');
      console.log(`   - Coverage: ${coveragePercentage}% (target: 90%+)`);
      console.log(`   - All APIs connected`);
      console.log(`   - No critical data quality issues`);
      results.status = 'PASSED';
    } else {
      console.log('⚠️  VALIDATION COMPLETED WITH WARNINGS');
      console.log(`   - Coverage: ${coveragePercentage}% (target: 90%+)`);
      if (results.errors.length > 0) {
        console.log(`   - ${results.errors.length} issues found (see below)`);
      }
      results.status = 'WARNING';
    }

    if (results.errors.length > 0) {
      console.log('\n⚠️  Issues found:');
      results.errors.forEach((err: string) => {
        console.log(`   - ${err}`);
      });
    }

    console.log('\n' + '='.repeat(80));

    // Export results to JSON
    const fs = require('fs');
    fs.writeFileSync(
      'validation-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\n✅ Validation results exported to validation-results.json');

    await prisma.$disconnect();
    process.exit(passedValidation ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    results.status = 'FAILED';
    results.error = error instanceof Error ? error.message : 'Unknown error';
    await prisma.$disconnect();
    process.exit(1);
  }
}

comprehensiveValidation();
