import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface MissingPolicyInfo {
  template: string;
  settingsCount: number;
  controlsAffected: number;
  settings: Array<{
    name: string;
    controlIds: number[];
  }>;
  configurationGuide: string;
}

async function generateMissingPoliciesReport() {
  console.log('\n' + '='.repeat(80));
  console.log('MISSING POLICIES CONFIGURATION REPORT');
  console.log('='.repeat(80) + '\n');

  // Get existing policy templates
  const policies = await prisma.m365Policy.findMany({
    select: { odataType: true, templateFamily: true }
  });
  const existingTemplates = new Set(policies.map(p => p.odataType).filter(Boolean));

  // Get all settings with control mappings
  const settings = await prisma.m365Setting.findMany({
    where: { isActive: true },
    include: {
      controlMappings: {
        select: { controlId: true }
      }
    }
  });

  // Find settings with templates that don't exist
  const missingTemplates = new Map<string, MissingPolicyInfo>();

  for (const setting of settings) {
    if (setting.policyTemplate && !existingTemplates.has(setting.policyTemplate)) {
      if (!missingTemplates.has(setting.policyTemplate)) {
        missingTemplates.set(setting.policyTemplate, {
          template: setting.policyTemplate,
          settingsCount: 0,
          controlsAffected: 0,
          settings: [],
          configurationGuide: getConfigurationGuide(setting.policyTemplate)
        });
      }

      const info = missingTemplates.get(setting.policyTemplate)!;
      info.settingsCount++;
      info.settings.push({
        name: setting.displayName,
        controlIds: setting.controlMappings.map(m => m.controlId)
      });
    }
  }

  // Calculate unique controls per template
  for (const info of missingTemplates.values()) {
    const uniqueControls = new Set<number>();
    info.settings.forEach(s => s.controlIds.forEach(id => uniqueControls.add(id)));
    info.controlsAffected = uniqueControls.size;
  }

  // Sort by impact (controls affected)
  const sortedTemplates = [...missingTemplates.values()].sort(
    (a, b) => b.controlsAffected - a.controlsAffected
  );

  // Generate console output
  console.log('MISSING POLICY TYPES (by impact)\n');

  let totalSettings = 0;
  let totalControls = new Set<number>();

  for (const info of sortedTemplates) {
    console.log(`${'─'.repeat(70)}`);
    console.log(`📋 ${info.template}`);
    console.log(`   Settings: ${info.settingsCount} | Controls affected: ${info.controlsAffected}`);
    console.log(`\n   Configuration Guide:`);
    console.log(`   ${info.configurationGuide.split('\n').join('\n   ')}`);
    console.log();

    totalSettings += info.settingsCount;
    info.settings.forEach(s => s.controlIds.forEach(id => totalControls.add(id)));
  }

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log(`Total missing policy types: ${sortedTemplates.length}`);
  console.log(`Total settings affected: ${totalSettings}`);
  console.log(`Total unique controls affected: ${totalControls.size}`);

  // Generate markdown report
  const report = generateMarkdownReport(sortedTemplates, totalSettings, totalControls.size);
  const reportPath = 'MISSING_POLICIES_REPORT.md';
  fs.writeFileSync(reportPath, report);
  console.log(`\n✅ Report saved to: ${reportPath}`);

  await prisma.$disconnect();
}

function getConfigurationGuide(template: string): string {
  const guides: Record<string, string> = {
    '#microsoft.graph.dataLossPreventionPolicy': `
**Microsoft Purview DLP Policies**
1. Go to Microsoft Purview Compliance Center
2. Navigate to Data Loss Prevention > Policies
3. Create policies to protect sensitive information (CUI, PII, etc.)
4. Configure locations: Exchange, SharePoint, OneDrive, Teams
5. Set up alert notifications and incident reports

Required permissions: Information Protection Admin`,

    '#microsoft.graph.privilegedIdentityManagement': `
**Privileged Identity Management (PIM)**
1. Go to Microsoft Entra admin center
2. Navigate to Identity Governance > Privileged Identity Management
3. Configure Azure AD roles for just-in-time access
4. Set up activation requirements (MFA, justification, approval)
5. Configure role settings and alerts

Required permissions: Privileged Role Administrator`,

    '#microsoft.graph.attackSimulationTraining': `
**Attack Simulation Training**
1. Go to Microsoft 365 Defender portal
2. Navigate to Email & collaboration > Attack simulation training
3. Create simulation campaigns (phishing, credential harvest)
4. Set up automated training for users who fail simulations
5. Configure reporting and tracking

Required permissions: Attack Simulation Admin`,

    '#microsoft.graph.windows10CustomConfiguration': `
**Windows Custom Configuration (OMA-URI)**
1. Go to Microsoft Intune admin center
2. Navigate to Devices > Configuration profiles
3. Create profile: Windows 10 and later > Templates > Custom
4. Add OMA-URI settings for advanced Windows configurations
5. Assign to device groups

Note: Many settings may already exist in Security Baselines`,

    '#microsoft.graph.iosManagedAppProtection': `
**iOS App Protection Policies**
1. Go to Microsoft Intune admin center
2. Navigate to Apps > App protection policies
3. Create policy for iOS/iPadOS
4. Configure data protection settings (encryption, copy/paste, etc.)
5. Assign to user groups

Note: You have existing App Protection policies - verify they cover all required settings`,

    '#microsoft.graph.androidManagedAppProtection': `
**Android App Protection Policies**
1. Go to Microsoft Intune admin center
2. Navigate to Apps > App protection policies
3. Create policy for Android
4. Configure data protection settings
5. Assign to user groups`,

    '#microsoft.graph.windowsDefenderAdvancedThreatProtectionConfiguration': `
**Windows Defender ATP Configuration**
1. Go to Microsoft Intune admin center
2. Navigate to Endpoint security > Endpoint detection and response
3. Create EDR policy with Defender for Endpoint settings
4. Configure sample submission, telemetry, etc.
5. Assign to device groups

Alternative: Use Security Baselines which include many Defender settings`,

    '#microsoft.graph.securityCenterConfiguration': `
**Security Center Configuration**
1. Go to Microsoft 365 Defender portal
2. Navigate to Settings > Endpoints
3. Configure vulnerability management settings
4. Set up security recommendations monitoring
5. Enable Microsoft Threat Intelligence

Note: Some settings may be at tenant level`,

    '#microsoft.graph.teamsConfiguration': `
**Microsoft Teams Configuration**
1. Go to Microsoft Teams admin center
2. Navigate to Messaging policies / Meeting policies
3. Configure guest access restrictions
4. Set up external access controls
5. Configure compliance and security settings

Note: Teams policies sync with M365 tenant settings`,

    '#microsoft.graph.exchangeOnlineConfiguration': `
**Exchange Online Configuration**
1. Go to Exchange admin center
2. Configure organization settings
3. Set up mail flow rules for TLS enforcement
4. Configure anti-spam and anti-malware policies
5. Enable audit logging

Note: Requires Exchange Administrator role`,

    '#microsoft.graph.iosCompliancePolicy': `
**iOS Device Compliance Policy**
1. Go to Microsoft Intune admin center
2. Navigate to Devices > Compliance policies
3. Create policy for iOS/iPadOS
4. Configure compliance requirements
5. Set up non-compliance actions`,

    '#microsoft.graph.androidCompliancePolicy': `
**Android Device Compliance Policy**
1. Go to Microsoft Intune admin center
2. Navigate to Devices > Compliance policies
3. Create policy for Android
4. Configure compliance requirements
5. Set up non-compliance actions`,
  };

  return guides[template] || `
**Configuration Required**
This policy type needs to be configured in your Microsoft 365 tenant.
Consult Microsoft documentation for: ${template.replace('#microsoft.graph.', '')}`;
}

function generateMarkdownReport(
  templates: MissingPolicyInfo[],
  totalSettings: number,
  totalControls: number
): string {
  const lines = [
    '# Missing Policies Configuration Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- **Missing policy types**: ${templates.length}`,
    `- **Settings affected**: ${totalSettings}`,
    `- **Controls affected**: ${totalControls}`,
    '',
    '## Priority Order (by control impact)',
    '',
  ];

  let priority = 1;
  for (const info of templates) {
    lines.push(`### ${priority}. ${info.template.replace('#microsoft.graph.', '').replace('#settingsCatalog.', '')}`);
    lines.push('');
    lines.push(`- **Settings**: ${info.settingsCount}`);
    lines.push(`- **Controls affected**: ${info.controlsAffected}`);
    lines.push('');
    lines.push('**Configuration Guide:**');
    lines.push('');
    lines.push(info.configurationGuide.trim());
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>Settings list</summary>');
    lines.push('');
    for (const setting of info.settings.slice(0, 10)) {
      lines.push(`- ${setting.name}`);
    }
    if (info.settings.length > 10) {
      lines.push(`- ... and ${info.settings.length - 10} more`);
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
    priority++;
  }

  lines.push('---');
  lines.push('');
  lines.push('*This report identifies policy types that need to be configured in your Microsoft 365 tenant for full NIST 800-171 compliance coverage.*');

  return lines.join('\n');
}

generateMissingPoliciesReport().catch(console.error);
