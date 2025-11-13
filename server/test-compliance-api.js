/**
 * Test Script for Compliance Manager API
 *
 * This script tests the Compliance Manager API endpoints to verify:
 * 1. Can we connect to Compliance Manager?
 * 2. Can we see the NIST 800-171 assessment?
 * 3. What permissions do we need?
 */

const fetch = require('node-fetch');

const SERVER_URL = 'http://localhost:5001';

async function testComplianceManagerAPI() {
  console.log('='.repeat(60));
  console.log('Testing Compliance Manager API Integration');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Test 1: Get all assessments
    console.log('Test 1: Fetching all Compliance Manager assessments...');
    const assessmentsResponse = await fetch(`${SERVER_URL}/api/m365/compliance-manager/assessments`);
    const assessmentsData = await assessmentsResponse.json();

    if (assessmentsResponse.ok && assessmentsData.success) {
      console.log('✅ SUCCESS: Found assessments!');
      console.log(`   Found ${assessmentsData.assessments.length} assessment(s)`);

      assessmentsData.assessments.forEach((assessment, idx) => {
        console.log(`   ${idx + 1}. ${assessment.displayName}`);
        console.log(`      ID: ${assessment.id}`);
        console.log(`      Status: ${assessment.status}`);
      });
      console.log('');
    } else {
      console.log('❌ FAILED: Could not fetch assessments');
      console.log(`   Status: ${assessmentsResponse.status}`);
      console.log(`   Error: ${assessmentsData.error || assessmentsData.message}`);
      console.log('');

      if (assessmentsResponse.status === 403) {
        console.log('🔐 Permission Issue Detected!');
        console.log('   You need to add API permissions in Azure AD.');
        console.log('   Check the error message above for the required permission.');
      }
      console.log('');
    }

    // Test 2: Get NIST assessment specifically
    console.log('Test 2: Looking for NIST 800-171 assessment...');
    const nistResponse = await fetch(`${SERVER_URL}/api/m365/compliance-manager/nist-assessment`);
    const nistData = await nistResponse.json();

    if (nistResponse.ok && nistData.success) {
      console.log('✅ SUCCESS: Found NIST 800-171 assessment!');
      console.log(`   Name: ${nistData.assessment.displayName}`);
      console.log(`   ID: ${nistData.assessment.id}`);
      console.log(`   Status: ${nistData.assessment.status}`);
      if (nistData.assessment.score) {
        console.log(`   Score: ${nistData.assessment.score.current} / ${nistData.assessment.score.max}`);
      }
      console.log('');
    } else {
      console.log('❌ FAILED: Could not find NIST assessment');
      console.log(`   Status: ${nistResponse.status}`);
      console.log(`   Message: ${nistData.error || nistData.message}`);
      console.log('');
    }

    // Test 3: Get compliance score summary
    console.log('Test 3: Fetching Compliance Score summary...');
    const scoreResponse = await fetch(`${SERVER_URL}/api/m365/compliance-manager`);
    const scoreData = await scoreResponse.json();

    if (scoreResponse.ok && scoreData.success) {
      console.log('✅ SUCCESS: Got Compliance Score!');
      console.log(`   Assessment: ${scoreData.summary.assessmentName}`);
      console.log(`   Total Score: ${scoreData.summary.totalScore.toFixed(2)} / ${scoreData.summary.maxScore.toFixed(0)}`);
      console.log(`   Percentage: ${scoreData.summary.percentage.toFixed(1)}%`);
      console.log(`   Your Points: ${scoreData.summary.yourPoints.toFixed(0)} / ${scoreData.summary.yourMaxPoints.toFixed(0)}`);
      console.log(`   Microsoft Points: ${scoreData.summary.microsoftPoints.toFixed(0)} / ${scoreData.summary.microsoftMaxPoints.toFixed(0)}`);
      console.log('');
    } else {
      console.log('❌ FAILED: Could not fetch compliance score');
      console.log(`   Status: ${scoreResponse.status}`);
      console.log(`   Message: ${scoreData.error || scoreData.message}`);
      console.log('');
    }

    // Test 4: Get improvement actions
    console.log('Test 4: Fetching improvement actions...');
    const actionsResponse = await fetch(`${SERVER_URL}/api/m365/compliance-manager/improvement-actions`);
    const actionsData = await actionsResponse.json();

    if (actionsResponse.ok && actionsData.success) {
      console.log('✅ SUCCESS: Found improvement actions!');
      console.log(`   Total actions: ${actionsData.count}`);

      if (actionsData.count > 0) {
        console.log('   Sample actions:');
        actionsData.actions.slice(0, 5).forEach((action, idx) => {
          console.log(`   ${idx + 1}. ${action.title}`);
          console.log(`      Status: ${action.status || 'Unknown'}`);
          console.log(`      Category: ${action.category}`);
        });
      }
      console.log('');
    } else {
      console.log('❌ FAILED: Could not fetch improvement actions');
      console.log(`   Status: ${actionsResponse.status}`);
      console.log(`   Message: ${actionsData.error || actionsData.message}`);
      console.log('');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));

    const allPassed =
      assessmentsResponse.ok &&
      nistResponse.ok &&
      scoreResponse.ok &&
      actionsResponse.ok;

    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('');
      console.log('Your Compliance Manager integration is working correctly!');
      console.log('You can now view your compliance data in the NIST Tool.');
      console.log('');
      console.log('Next steps:');
      console.log('1. Open the NIST Tool in your browser');
      console.log('2. Navigate to any NIST control');
      console.log('3. Click the "M365 Recommendations" tab');
      console.log('4. You should see your Compliance Score and improvement actions!');
    } else {
      console.log('⚠️ SOME TESTS FAILED');
      console.log('');
      console.log('Check the errors above to determine what needs to be fixed.');
      console.log('');
      console.log('Common issues:');
      console.log('1. Missing API permissions - Add the required permission in Azure AD');
      console.log('2. Assessment not created - Ensure you created a NIST 800-171 assessment');
      console.log('3. Server not running - Make sure your server is running on port 5001');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.log('');
    console.log('='.repeat(60));
    console.log('❌ FATAL ERROR');
    console.log('='.repeat(60));
    console.log(`Error: ${error.message}`);
    console.log('');
    console.log('Possible causes:');
    console.log('1. Server is not running - Start with: npm run dev');
    console.log('2. Wrong server URL - Check that server is on http://localhost:5001');
    console.log('3. Network issue - Check your internet connection');
    console.log('='.repeat(60));
  }
}

// Run the test
console.log('Starting Compliance Manager API tests...');
console.log('Make sure your server is running (npm run dev)');
console.log('');

testComplianceManagerAPI().catch(console.error);
