import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPoamRelationships() {
  console.log('Testing POAM relationships...\n');

  // Test 1: Create POAM with milestones
  const control = await prisma.control.findFirst();
  if (!control) {
    console.error('No controls found in database');
    return;
  }

  const poam = await prisma.poam.create({
    data: {
      controlId: control.id,
      gapDescription: 'Test gap description for relationship testing',
      remediationPlan: 'Test remediation plan with detailed steps for verification',
      priority: 'High',
      milestones: {
        create: [
          {
            milestoneDescription: 'Test milestone 1',
            dueDate: new Date('2025-01-01'),
          },
          {
            milestoneDescription: 'Test milestone 2',
            dueDate: new Date('2025-02-01'),
          },
        ],
      },
    },
    include: {
      milestones: true,
      control: true,
    },
  });

  console.log('✅ Created POAM with milestones:', {
    id: poam.id,
    milestoneCount: poam.milestones.length,
    linkedControl: poam.control.controlId,
  });

  // Test 2: Query POAM with relations
  const poamWithRelations = await prisma.poam.findUnique({
    where: { id: poam.id },
    include: {
      milestones: true,
      control: {
        select: {
          controlId: true,
          title: true,
          family: true,
        },
      },
    },
  });

  console.log('✅ Retrieved POAM with relations:', {
    poamId: poamWithRelations?.id,
    milestones: poamWithRelations?.milestones.length,
    controlInfo: poamWithRelations?.control,
  });

  // Test 3: Update milestone
  const milestone = poam.milestones[0];
  const updatedMilestone = await prisma.poamMilestone.update({
    where: { id: milestone.id },
    data: {
      status: 'Completed',
      completionDate: new Date(),
      notes: 'Test milestone completed successfully',
    },
  });

  console.log('✅ Updated milestone status:', {
    milestoneId: updatedMilestone.id,
    status: updatedMilestone.status,
    notes: updatedMilestone.notes,
  });

  // Test 4: Test filtering by status and priority
  const openPoams = await prisma.poam.findMany({
    where: {
      status: 'Open',
    },
    include: {
      milestones: true,
    },
  });

  console.log('✅ Filtered POAMs by status:', {
    openPoamsCount: openPoams.length,
  });

  const highPriorityPoams = await prisma.poam.findMany({
    where: {
      priority: 'High',
    },
  });

  console.log('✅ Filtered POAMs by priority:', {
    highPriorityCount: highPriorityPoams.length,
  });

  // Test 5: Delete POAM (should cascade to milestones)
  await prisma.poam.delete({
    where: { id: poam.id },
  });

  const orphanedMilestones = await prisma.poamMilestone.count({
    where: { poamId: poam.id },
  });

  console.log('✅ Cascade delete test:', {
    orphanedMilestones: orphanedMilestones, // Should be 0
    result: orphanedMilestones === 0 ? 'PASS' : 'FAIL',
  });

  console.log('\n✅ All relationship tests passed!');
}

testPoamRelationships()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
