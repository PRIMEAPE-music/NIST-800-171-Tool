import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ControlData {
  controlId: string;
  family: string;
  title: string;
  requirementText: string;
  priority: string;
}

interface ControlsFile {
  version: string;
  publicationDate: string;
  totalControls: number;
  families: Record<string, { name: string; controlCount: number }>;
  controls: ControlData[];
}

async function seedControls() {
  console.log('🌱 Seeding NIST 800-171 Rev 3 controls...\n');

  // Read the controls JSON file
  const controlsFilePath = path.join(__dirname, '../../data/nist-800-171-controls.json');

  if (!fs.existsSync(controlsFilePath)) {
    throw new Error(`Controls file not found at: ${controlsFilePath}`);
  }

  const controlsData: ControlsFile = JSON.parse(
    fs.readFileSync(controlsFilePath, 'utf-8')
  );

  console.log(`📋 Loading ${controlsData.totalControls} controls from ${controlsData.version}\n`);

  // Optional: Clear existing controls (uncomment if needed)
  console.log('🗑️  Clearing existing controls...');
  await prisma.changeHistory.deleteMany();
  await prisma.controlPolicyMapping.deleteMany();
  await prisma.poamMilestone.deleteMany();
  await prisma.poam.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.controlStatus.deleteMany();
  await prisma.control.deleteMany();
  console.log('✓ Existing data cleared\n');

  // Seed controls
  let successCount = 0;
  let errorCount = 0;

  for (const control of controlsData.controls) {
    try {
      const createdControl = await prisma.control.create({
        data: {
          controlId: control.controlId,
          family: control.family,
          title: control.title,
          requirementText: control.requirementText,
          priority: control.priority,
          revision: '3',
          publicationDate: controlsData.publicationDate,
        },
      });

      // Create default control status
      await prisma.controlStatus.create({
        data: {
          controlId: createdControl.id,
          status: 'Not Started',
        },
      });

      successCount++;
      process.stdout.write(`\r✓ Seeded ${successCount}/${controlsData.controls.length} controls`);
    } catch (error) {
      errorCount++;
      console.error(`\n❌ Error seeding control ${control.controlId}:`, error);
    }
  }

  console.log(`\n\n✅ Seeding complete!`);
  console.log(`   ✓ Success: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   ✗ Errors: ${errorCount}`);
  }
  console.log(`   📊 Total: ${controlsData.controls.length}\n`);

  // Display family breakdown
  const familyCounts = await prisma.control.groupBy({
    by: ['family'],
    _count: true,
  });

  console.log('📊 Control Families:');
  const sortedFamilies = familyCounts.sort((a, b) => a.family.localeCompare(b.family));
  for (const { family, _count } of sortedFamilies) {
    const familyInfo = controlsData.families[family];
    const displayName = familyInfo?.name || 'Unknown';
    console.log(`   ${family}: ${_count} controls - ${displayName}`);
  }
}

async function seedPoams() {
  console.log('\n🌱 Seeding POAMs...\n');

  // Get some control IDs to link POAMs to
  const controls = await prisma.control.findMany({
    take: 5,
    include: {
      status: true,
    },
  });

  if (controls.length === 0) {
    console.log('❌ No controls found, skipping POAM seed');
    return;
  }

  const poams = [
    {
      controlId: controls[0].id,
      gapDescription: 'Multi-factor authentication not enforced for all users',
      remediationPlan: 'Deploy conditional access policies via Intune to enforce MFA for all user accounts',
      assignedTo: 'IT Security Team',
      priority: 'High',
      status: 'In Progress',
      startDate: new Date('2024-11-01'),
      targetCompletionDate: new Date('2024-12-15'),
      resourcesRequired: 'Azure AD Premium P1 licenses, 40 hours implementation time',
      budgetEstimate: 5000,
      milestones: {
        create: [
          {
            milestoneDescription: 'Purchase Azure AD Premium licenses',
            dueDate: new Date('2024-11-15'),
            status: 'Completed',
            completionDate: new Date('2024-11-10'),
            notes: 'Licenses purchased through Microsoft 365 admin center',
          },
          {
            milestoneDescription: 'Configure conditional access policies',
            dueDate: new Date('2024-11-30'),
            status: 'In Progress',
            notes: 'Currently configuring pilot policy for test group',
          },
          {
            milestoneDescription: 'User training and communication',
            dueDate: new Date('2024-12-10'),
            status: 'Pending',
            notes: 'Training materials being prepared',
          },
        ],
      },
    },
    {
      controlId: controls[1].id,
      gapDescription: 'Lack of centralized audit logging for security events',
      remediationPlan: 'Implement Microsoft Purview Audit (Premium) and configure log retention policies',
      assignedTo: 'Compliance Team',
      priority: 'Medium',
      status: 'Open',
      targetCompletionDate: new Date('2025-02-01'),
      resourcesRequired: 'Purview Audit licenses, storage for log retention',
      budgetEstimate: 3000,
      milestones: {
        create: [
          {
            milestoneDescription: 'Evaluate audit logging requirements',
            dueDate: new Date('2024-12-01'),
            status: 'Pending',
          },
          {
            milestoneDescription: 'Purchase Purview licenses',
            dueDate: new Date('2024-12-15'),
            status: 'Pending',
          },
        ],
      },
    },
  ];

  let poamCount = 0;
  for (const poamData of poams) {
    await prisma.poam.create({
      data: poamData,
    });
    poamCount++;
  }

  console.log(`✅ Seeded ${poamCount} POAMs with milestones\n`);
}

async function seedSettings() {
  console.log('\n🌱 Seeding default settings...\n');

  const defaultSettings = [
    // M365 Configuration (encrypted values stored, these are placeholders)
    { key: 'm365_tenant_id', value: '', category: 'm365' },
    { key: 'm365_client_id', value: '', category: 'm365' },
    { key: 'm365_client_secret', value: '', category: 'm365' },
    { key: 'm365_redirect_uri', value: 'http://localhost:3000/auth/callback', category: 'm365' },
    { key: 'm365_last_sync', value: '', category: 'm365' },
    { key: 'm365_auto_sync_enabled', value: 'false', category: 'm365' },
    { key: 'm365_sync_interval_hours', value: '24', category: 'm365' },

    // Organization Settings
    { key: 'org_name', value: '', category: 'organization' },
    { key: 'org_compliance_officer_name', value: '', category: 'organization' },
    { key: 'org_compliance_officer_email', value: '', category: 'organization' },
    { key: 'org_assessment_frequency_days', value: '90', category: 'organization' },

    // User Preferences
    { key: 'pref_date_format', value: 'MM/DD/YYYY', category: 'preferences' },
    { key: 'pref_items_per_page', value: '50', category: 'preferences' },
    { key: 'pref_default_view', value: 'table', category: 'preferences' },
    { key: 'pref_notifications_enabled', value: 'true', category: 'preferences' },

    // System Settings
    { key: 'system_last_backup', value: '', category: 'system' },
    { key: 'system_auto_backup_enabled', value: 'false', category: 'system' },
  ];

  let settingsCount = 0;
  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
    settingsCount++;
  }

  console.log(`✅ Seeded ${settingsCount} default settings\n`);
}

async function main() {
  await seedControls();
  await seedPoams();
  await seedSettings();
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
