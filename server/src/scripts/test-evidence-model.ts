import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEvidenceModel() {
  try {
    console.log('🧪 Testing Evidence Model...\n');

    // Test: Find a control to use
    const testControl = await prisma.control.findFirst();

    if (!testControl) {
      console.error('❌ No controls found. Run seed script first.');
      return;
    }

    console.log('✅ Found test control:', {
      id: testControl.id,
      controlId: testControl.controlId,
      title: testControl.title
    });

    // Test: Create evidence record
    console.log('\n📝 Creating evidence record...');
    const evidence = await prisma.evidence.create({
      data: {
        controlId: testControl.id,
        fileName: 'test_1234567890_policy.pdf',
        originalName: 'policy.pdf',
        filePath: '/uploads/AC/test_1234567890_policy.pdf',
        fileType: 'application/pdf',
        fileSize: 102400,
        description: 'Test evidence document',
        tags: JSON.stringify(['policy', 'test']),
      },
    });

    console.log('✅ Evidence created:', {
      id: evidence.id,
      fileName: evidence.fileName,
      originalName: evidence.originalName,
      fileType: evidence.fileType,
      fileSize: evidence.fileSize
    });

    // Test: Query evidence with control
    console.log('\n🔍 Querying evidence with control...');
    const evidenceWithControl = await prisma.evidence.findUnique({
      where: { id: evidence.id },
      include: { control: true },
    });

    console.log('✅ Evidence with control:', {
      evidenceId: evidenceWithControl?.id,
      fileName: evidenceWithControl?.fileName,
      controlId: evidenceWithControl?.control.controlId,
      controlTitle: evidenceWithControl?.control.title
    });

    // Test: Update evidence
    console.log('\n✏️ Updating evidence...');
    const updatedEvidence = await prisma.evidence.update({
      where: { id: evidence.id },
      data: {
        description: 'Updated test evidence document',
        isArchived: true,
      },
    });

    console.log('✅ Evidence updated:', {
      id: updatedEvidence.id,
      description: updatedEvidence.description,
      isArchived: updatedEvidence.isArchived
    });

    // Test: Query all evidence for the control
    console.log('\n📊 Querying all evidence for control...');
    const controlEvidence = await prisma.evidence.findMany({
      where: { controlId: testControl.id },
    });

    console.log(`✅ Found ${controlEvidence.length} evidence file(s) for control ${testControl.controlId}`);

    // Test: Delete evidence
    console.log('\n🗑️ Deleting evidence...');
    await prisma.evidence.delete({
      where: { id: evidence.id },
    });

    console.log('✅ Evidence deleted successfully');

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Error testing evidence model:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testEvidenceModel();
