import axios from 'axios';

const API_URL = 'http://localhost:3001/api/reports';

async function testReportGeneration() {
  console.log('Testing report generation...');

  const reportTypes = [
    'executive-summary',
    'detailed-compliance',
    'gap-analysis',
    'poam',
    'progress',
  ];
  const formats = ['csv', 'excel', 'pdf'];

  for (const reportType of reportTypes) {
    for (const format of formats) {
      try {
        console.log(`Generating ${reportType} as ${format}...`);
        const response = await axios.post(`${API_URL}/generate`, {
          reportType,
          format,
        });
        console.log(`✓ Success: ${response.data.fileName}`);
      } catch (error: any) {
        console.error(`✗ Failed: ${error.response?.data?.error || error.message}`);
      }
    }
  }
}

async function testBatchGeneration() {
  console.log('\nTesting batch generation...');

  try {
    const response = await axios.post(`${API_URL}/batch`, {
      reportConfigs: [
        { reportType: 'executive-summary', format: 'pdf' },
        { reportType: 'gap-analysis', format: 'excel' },
        { reportType: 'poam', format: 'csv' },
      ],
    });
    console.log('✓ Batch generation succeeded');
    console.log(`  Success: ${response.data.successCount}, Failed: ${response.data.failCount}`);
  } catch (error: any) {
    console.error('✗ Batch generation failed:', error.response?.data || error.message);
  }
}

async function testReportHistory() {
  console.log('\nTesting report history...');

  try {
    const response = await axios.get(`${API_URL}/history`);
    console.log(`✓ Retrieved ${response.data.length} reports from history`);
  } catch (error: any) {
    console.error('✗ Failed to get history:', error.message);
  }
}

async function testReportStatistics() {
  console.log('\nTesting report statistics...');

  try {
    const response = await axios.get(`${API_URL}/statistics`);
    console.log(`✓ Statistics retrieved successfully`);
    console.log(`  Total Reports: ${response.data.totalReports}`);
    console.log(`  Recent Reports (30 days): ${response.data.recentReports}`);
    console.log(`  Total File Size: ${(response.data.totalFileSize / 1024 / 1024).toFixed(2)} MB`);
  } catch (error: any) {
    console.error('✗ Failed to get statistics:', error.message);
  }
}

async function testReportTypes() {
  console.log('\nTesting report types endpoint...');

  try {
    const response = await axios.get(`${API_URL}/types`);
    console.log(`✓ Retrieved ${response.data.length} report types`);
    response.data.forEach((type: any) => {
      console.log(`  - ${type.label}: ${type.formats.join(', ')}`);
    });
  } catch (error: any) {
    console.error('✗ Failed to get report types:', error.message);
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('NIST 800-171 Report Generation Tests');
  console.log('========================================\n');

  await testReportTypes();
  await testReportGeneration();
  await testBatchGeneration();
  await testReportHistory();
  await testReportStatistics();

  console.log('\n========================================');
  console.log('Tests complete');
  console.log('========================================');
}

runAllTests();
