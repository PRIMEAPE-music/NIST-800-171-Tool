import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function generateDocumentation() {
  console.log('📝 Generating documentation...\n');

  const doc: string[] = [
    '# NIST 800-171 Compliance Application - System Documentation',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Overview',
    '',
    'This document provides a comprehensive overview of the Microsoft 365 policy integration',
    'and compliance mapping for NIST 800-171 controls.',
    '',
  ];

  // Database statistics
  const totalSettings = await prisma.m365Setting.count();
  const settingsWithChecks = await prisma.m365Setting.count({
    where: { complianceChecks: { some: {} } },
  });
  const totalPolicies = await prisma.m365Policy.count();
  const activePolicies = await prisma.m365Policy.count({ where: { isActive: true } });

  doc.push('## System Statistics', '');
  doc.push(`- **Total M365 Settings**: ${totalSettings}`);
  doc.push(`- **Settings with Compliance Checks**: ${settingsWithChecks} (${((settingsWithChecks/totalSettings)*100).toFixed(1)}%)`);
  doc.push(`- **Total Policies Synced**: ${totalPolicies}`);
  doc.push(`- **Active Policies**: ${activePolicies}`, '');

  // Policy types
  const policyTypes = await prisma.m365Policy.groupBy({
    by: ['policyType', 'templateFamily'],
    _count: { id: true },
  });

  doc.push('## Policy Types', '');
  doc.push('| Source | Template Family | Count |');
  doc.push('|--------|-----------------|-------|');
  policyTypes.forEach(p => {
    doc.push(`| ${p.policyType} | ${p.templateFamily || 'Unknown'} | ${p._count.id} |`);
  });
  doc.push('');

  // Control families
  const controlFamilies = await prisma.$queryRaw<Array<{
    controlFamily: string;
    control_count: number;
    avg_compliance: number;
  }>>`
    SELECT
      c.family as controlFamily,
      COUNT(*) as control_count,
      AVG(cm.compliance_percentage) as avg_compliance
    FROM controls c
    INNER JOIN control_m365_compliance cm ON c.id = cm.control_id
    GROUP BY c.family
    ORDER BY c.family
  `;

  doc.push('## Compliance by Control Family', '');
  doc.push('| Family | Controls | Avg Compliance |');
  doc.push('|--------|----------|----------------|');
  controlFamilies.forEach(f => {
    doc.push(`| ${f.controlFamily} | ${f.control_count} | ${f.avg_compliance.toFixed(1)}% |`);
  });
  doc.push('');

  // Permissions required
  doc.push('## Required Microsoft Graph Permissions', '');
  doc.push('The following Application permissions are required:', '');
  doc.push('- `DeviceManagementConfiguration.Read.All` - Intune policies');
  doc.push('- `Policy.Read.All` - Azure AD policies');
  doc.push('- `InformationProtectionPolicy.Read.All` - Purview DLP');
  doc.push('- `RoleManagement.Read.Directory` - PIM policies');
  doc.push('- `AttackSimulation.Read.All` - Attack simulation training');
  doc.push('');

  // Write to file
  fs.writeFileSync('SYSTEM_DOCUMENTATION.md', doc.join('\n'));
  console.log('✅ Documentation generated: SYSTEM_DOCUMENTATION.md\n');

  await prisma.$disconnect();
}

generateDocumentation();
