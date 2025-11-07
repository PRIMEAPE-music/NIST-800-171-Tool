# Phase 5: Testing Checklist - Evidence Management

## Overview
This document provides comprehensive testing scenarios for the evidence management system. Test each feature thoroughly before moving to Phase 6.

## Test Environment Setup

### 1. Prerequisites
- [ ] Backend server running on `http://localhost:3001`
- [ ] Frontend dev server running on `http://localhost:3000`
- [ ] Database seeded with NIST 800-171 Rev 3 controls
- [ ] `/uploads` directory exists and is writable
- [ ] Environment variables configured correctly

### 2. Test Data Requirements
Prepare test files in various formats:
- [ ] Sample PDF (< 10MB)
- [ ] Sample DOCX file
- [ ] Sample XLSX file
- [ ] Sample PNG image
- [ ] Sample JPG image
- [ ] Large file (> 10MB) for validation testing
- [ ] Invalid file type (.exe, .zip) for validation testing

## Backend API Testing

### File Upload Endpoint
**Endpoint**: `POST /api/evidence/upload`

#### Test Case 1: Single File Upload
```bash
curl -X POST http://localhost:3001/api/evidence/upload \
  -F "files=@test-document.pdf" \
  -F "controlId=YOUR_CONTROL_UUID" \
  -F "description=Test access control policy"
```
- [ ] Returns 201 status code
- [ ] Returns evidence object with all fields
- [ ] File appears in `/uploads/{FAMILY}/` directory
- [ ] Database record created
- [ ] `fileName` is sanitized and includes timestamp
- [ ] `originalName` matches uploaded file name

#### Test Case 2: Multiple File Upload
```bash
curl -X POST http://localhost:3001/api/evidence/upload \
  -F "files=@document1.pdf" \
  -F "files=@image1.png" \
  -F "files=@spreadsheet1.xlsx" \
  -F "controlId=YOUR_CONTROL_UUID"
```
- [ ] All files uploaded successfully
- [ ] Returns array of evidence objects
- [ ] Each file has unique `fileName`
- [ ] All files stored in correct family directory

#### Test Case 3: File Size Validation
```bash
# Upload file > 10MB
curl -X POST http://localhost:3001/api/evidence/upload \
  -F "files=@large-file.pdf" \
  -F "controlId=YOUR_CONTROL_UUID"
```
- [ ] Returns 400 status code
- [ ] Error message indicates file too large
- [ ] No file created on disk
- [ ] No database record created

#### Test Case 4: File Type Validation
```bash
# Upload invalid file type
curl -X POST http://localhost:3001/api/evidence/upload \
  -F "files=@malicious.exe" \
  -F "controlId=YOUR_CONTROL_UUID"
```
- [ ] Returns 400 status code
- [ ] Error message indicates invalid file type
- [ ] No file created on disk
- [ ] No database record created

#### Test Case 5: Missing Control ID
```bash
curl -X POST http://localhost:3001/api/evidence/upload \
  -F "files=@document.pdf"
```
- [ ] Returns 400 status code
- [ ] Error message indicates control ID required
- [ ] Uploaded file is cleaned up
- [ ] No database record created

### Get Evidence Endpoints

#### Test Case 6: Get All Evidence
```bash
curl http://localhost:3001/api/evidence
```
- [ ] Returns 200 status code
- [ ] Returns array of evidence objects
- [ ] Each evidence includes control information
- [ ] Results ordered by upload date (newest first)

#### Test Case 7: Filter by Control ID
```bash
curl "http://localhost:3001/api/evidence?controlId=YOUR_CONTROL_UUID"
```
- [ ] Returns only evidence for specified control
- [ ] Returns empty array if no evidence exists

#### Test Case 8: Filter by Family
```bash
curl "http://localhost:3001/api/evidence?family=AC"
```
- [ ] Returns only evidence for AC family controls
- [ ] All returned evidence has control.family = "AC"

#### Test Case 9: Filter by File Type
```bash
curl "http://localhost:3001/api/evidence?fileType=pdf"
```
- [ ] Returns only PDF files
- [ ] All returned evidence has fileType containing "pdf"

#### Test Case 10: Filter by Date Range
```bash
curl "http://localhost:3001/api/evidence?startDate=2024-01-01&endDate=2024-12-31"
```
- [ ] Returns evidence within date range
- [ ] Correctly handles date boundaries

#### Test Case 11: Get Evidence by ID
```bash
curl http://localhost:3001/api/evidence/YOUR_EVIDENCE_UUID
```
- [ ] Returns 200 status code
- [ ] Returns complete evidence object with control
- [ ] Returns 404 for non-existent ID

#### Test Case 12: Get Evidence for Control
```bash
curl http://localhost:3001/api/evidence/control/YOUR_CONTROL_UUID
```
- [ ] Returns all evidence for the control
- [ ] Returns empty array if no evidence

### Update Evidence Endpoint

#### Test Case 13: Update Description
```bash
curl -X PUT http://localhost:3001/api/evidence/YOUR_EVIDENCE_UUID \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated description"}'
```
- [ ] Returns 200 status code
- [ ] Description updated in database
- [ ] Other fields unchanged
- [ ] `updatedAt` timestamp updated

#### Test Case 14: Update Tags
```bash
curl -X PUT http://localhost:3001/api/evidence/YOUR_EVIDENCE_UUID \
  -H "Content-Type: application/json" \
  -d '{"tags":["policy","audit","reviewed"]}'
```
- [ ] Tags updated in database
- [ ] Tags stored as JSON string

#### Test Case 15: Archive Evidence
```bash
curl -X PUT http://localhost:3001/api/evidence/YOUR_EVIDENCE_UUID \
  -H "Content-Type: application/json" \
  -d '{"isArchived":true}'
```
- [ ] `isArchived` flag set to true
- [ ] File still exists on disk
- [ ] Archived evidence filtered by default queries

### Delete Evidence Endpoint

#### Test Case 16: Delete Evidence
```bash
curl -X DELETE http://localhost:3001/api/evidence/YOUR_EVIDENCE_UUID
```
- [ ] Returns 200 status code
- [ ] Database record deleted
- [ ] File deleted from disk
- [ ] Returns 404 for non-existent ID

#### Test Case 17: Delete with Missing File
- [ ] Upload evidence
- [ ] Manually delete file from disk
- [ ] Call delete endpoint
- [ ] Database record still deleted successfully
- [ ] No error thrown

### Download Evidence Endpoint

#### Test Case 18: Download File
```bash
curl http://localhost:3001/api/evidence/download/YOUR_EVIDENCE_UUID \
  --output downloaded-file.pdf
```
- [ ] File downloads successfully
- [ ] Original filename preserved
- [ ] Content matches uploaded file
- [ ] Correct MIME type in response headers

### Gap Analysis Endpoint

#### Test Case 19: Get Evidence Gaps
```bash
curl http://localhost:3001/api/evidence/gaps
```
- [ ] Returns array of controls without evidence
- [ ] Includes control ID, family, title, priority
- [ ] Count matches expected number of gaps

### Statistics Endpoint

#### Test Case 20: Get Evidence Statistics
```bash
curl http://localhost:3001/api/evidence/stats
```
- [ ] Returns correct total file count
- [ ] Returns correct total size
- [ ] `filesByType` breakdown is accurate
- [ ] `controlsWithEvidence` count is correct
- [ ] `controlsWithoutEvidence` count is correct

## Frontend Testing

### File Upload Component

#### Test Case 21: Drag and Drop
- [ ] Navigate to Evidence Library
- [ ] Click "Upload Evidence"
- [ ] Drag a file into the dropzone
- [ ] File appears in selected files list
- [ ] File name and size displayed correctly
- [ ] Can remove file before uploading

#### Test Case 22: Click to Browse
- [ ] Click the dropzone area
- [ ] File picker opens
- [ ] Select file(s)
- [ ] Selected files appear in list

#### Test Case 23: Multiple File Selection
- [ ] Select multiple files at once
- [ ] All files appear in list
- [ ] Can remove individual files
- [ ] Can upload all files together

#### Test Case 24: File Type Validation (Frontend)
- [ ] Try to select/drop invalid file type
- [ ] Error message displayed
- [ ] File not added to list

#### Test Case 25: File Size Validation (Frontend)
- [ ] Try to select/drop file > 10MB
- [ ] Error message displayed
- [ ] File not added to list

#### Test Case 26: Upload Progress
- [ ] Select files and click upload
- [ ] Progress indicator appears
- [ ] Success message shown on completion
- [ ] File list cleared after successful upload
- [ ] Upload dialog can be closed

### Evidence Library Page

#### Test Case 27: Initial Load
- [ ] Navigate to `/evidence`
- [ ] Evidence cards display correctly
- [ ] Loading spinner shown while fetching
- [ ] Empty state shown if no evidence

#### Test Case 28: Evidence Card Display
- [ ] File icon matches file type (PDF, image, doc)
- [ ] Original filename displayed
- [ ] File size formatted correctly (KB, MB)
- [ ] Control chip shows control ID and family
- [ ] Description displayed if present
- [ ] Upload date formatted correctly

#### Test Case 29: Search Functionality
- [ ] Type in search box
- [ ] Results filter in real-time
- [ ] Can search by filename
- [ ] Can search by control ID
- [ ] "No results" message if no matches

#### Test Case 30: Download File
- [ ] Click download button on evidence card
- [ ] File downloads to browser
- [ ] Filename preserved

#### Test Case 31: Delete File
- [ ] Click delete button
- [ ] Confirmation dialog appears
- [ ] Click cancel - nothing happens
- [ ] Click delete - file removed
- [ ] Card disappears from view
- [ ] Success message shown

#### Test Case 32: Refresh Data
- [ ] Click refresh button
- [ ] Loading indicator appears
- [ ] Latest data fetched
- [ ] View updates with new data

### Evidence Gap Report Page

#### Test Case 33: Gap Report Display
- [ ] Navigate to `/evidence/gaps`
- [ ] Gap count displayed in summary card
- [ ] Table shows all controls without evidence
- [ ] Control ID, family, title, priority shown
- [ ] Priority chips color-coded correctly

#### Test Case 34: Upload from Gap Report
- [ ] Click "Upload Evidence" button in table row
- [ ] Navigates to control detail page
- [ ] (Or opens upload dialog with pre-selected control)

#### Test Case 35: Empty State
- [ ] Ensure all controls have evidence
- [ ] Navigate to gap report
- [ ] Empty state message displayed
- [ ] Message confirms no gaps

### Control Detail Integration

#### Test Case 36: View Evidence on Control Page
- [ ] Navigate to a control detail page
- [ ] Evidence section displays linked evidence
- [ ] Can upload evidence from control page
- [ ] Evidence count badge shows correct number

#### Test Case 37: Link Evidence to Control
- [ ] Upload evidence with control selected
- [ ] Evidence appears on control detail page
- [ ] Evidence shows correct control in library

## Integration Testing

### Test Case 38: End-to-End Upload Flow
1. [ ] Start at dashboard
2. [ ] Navigate to Evidence Library
3. [ ] Click "Upload Evidence"
4. [ ] Select control from dropdown
5. [ ] Drag in files
6. [ ] Add description
7. [ ] Click upload
8. [ ] Success message appears
9. [ ] Files appear in library
10. [ ] Files visible on control detail page
11. [ ] Gap report updated if needed

### Test Case 39: Evidence Lifecycle
1. [ ] Upload evidence file
2. [ ] View in library
3. [ ] Edit description
4. [ ] Download file
5. [ ] Archive file
6. [ ] Verify archived filter works
7. [ ] Delete file
8. [ ] Verify file and record removed

### Test Case 40: Multiple Controls
1. [ ] Upload evidence for Control A
2. [ ] Upload evidence for Control B
3. [ ] Filter by Control A - see only A's evidence
4. [ ] Filter by Control B - see only B's evidence
5. [ ] Clear filter - see both

## Performance Testing

### Test Case 41: Large File Upload
- [ ] Upload 9.5MB file (near limit)
- [ ] Upload completes successfully
- [ ] No timeout errors
- [ ] File accessible after upload

### Test Case 42: Multiple File Upload
- [ ] Upload 10 files at once
- [ ] All files process successfully
- [ ] UI remains responsive
- [ ] All files appear in library

### Test Case 43: Large Evidence Library
- [ ] Create 50+ evidence records
- [ ] Page loads in < 3 seconds
- [ ] Search/filter remains fast
- [ ] Scrolling is smooth

## Error Handling

### Test Case 44: Network Error
- [ ] Stop backend server
- [ ] Try to upload file
- [ ] Appropriate error message shown
- [ ] UI doesn't crash

### Test Case 45: Concurrent Upload
- [ ] Start uploading files
- [ ] Start second upload immediately
- [ ] Both uploads complete successfully
- [ ] No race conditions

### Test Case 46: Database Error
- [ ] Simulate database error (if possible)
- [ ] Error message shown to user
- [ ] Files cleaned up if upload fails

## Security Testing

### Test Case 47: Path Traversal
```bash
# Try to upload with malicious path
curl -X POST http://localhost:3001/api/evidence/upload \
  -F "files=@../../etc/passwd" \
  -F "controlId=YOUR_CONTROL_UUID"
```
- [ ] Request blocked/sanitized
- [ ] File not stored outside uploads directory

### Test Case 48: File Extension Mismatch
```bash
# Rename .exe to .pdf
curl -X POST http://localhost:3001/api/evidence/upload \
  -F "files=@malicious.pdf" \
  -F "controlId=YOUR_CONTROL_UUID"
```
- [ ] MIME type validation catches mismatch
- [ ] Upload rejected

## Accessibility Testing

### Test Case 49: Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter key triggers actions
- [ ] Focus indicators visible

### Test Case 50: Screen Reader
- [ ] All images have alt text
- [ ] Form fields have labels
- [ ] Error messages announced

## Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Edge

## Clean Up After Testing

### Test Case 51: Remove Test Data
- [ ] Delete all test evidence files
- [ ] Verify files removed from disk
- [ ] Database cleaned up
- [ ] Ready for next phase

## Sign-Off Checklist

Before proceeding to Phase 6:
- [ ] All backend API tests pass
- [ ] All frontend tests pass
- [ ] No console errors in browser
- [ ] No TypeScript errors
- [ ] Code follows project standards
- [ ] Dark theme consistently applied
- [ ] Mobile responsive (bonus)
- [ ] Error handling works correctly
- [ ] Performance is acceptable
- [ ] Security validations in place

## Known Issues / Notes
Document any issues found during testing:

```
Issue 1: [Description]
Status: [Open/Fixed]
Priority: [High/Medium/Low]

Issue 2: [Description]
Status: [Open/Fixed]
Priority: [High/Medium/Low]
```

## Test Results Summary

**Date Tested**: ___________
**Tester**: ___________

| Category | Tests Passed | Tests Failed | Notes |
|----------|-------------|--------------|-------|
| Backend API | __ / 20 | | |
| Frontend UI | __ / 19 | | |
| Integration | __ / 3 | | |
| Performance | __ / 3 | | |
| Error Handling | __ / 3 | | |
| Security | __ / 2 | | |
| Accessibility | __ / 2 | | |
| **TOTAL** | __ / 52 | | |

**Overall Status**: [ ] PASS [ ] FAIL

**Ready for Phase 6**: [ ] YES [ ] NO

## Next Steps
Once all tests pass, you're ready to begin **Phase 6: Microsoft 365 Integration**.
