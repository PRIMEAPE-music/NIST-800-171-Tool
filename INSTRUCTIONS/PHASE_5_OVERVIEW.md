# Phase 5: Evidence Management System - Overview

## Phase Objective
Build a complete evidence management system that allows IT administrators to upload, organize, link, and manage compliance documentation files for NIST 800-171 Rev 3 controls.

## Revision Note
**IMPORTANT**: This project now tracks NIST 800-171 Revision 3 (not Rev 2). All references should reflect "Rev 3" or "r3".

## Key Goals
1. **Evidence Library**: Central repository for all compliance documents
2. **File Upload System**: Drag-and-drop interface with validation
3. **Control Linking**: Associate evidence files with specific controls
4. **Gap Identification**: Identify controls without evidence
5. **File Management**: View, download, delete, and preview files
6. **Search & Filter**: Find evidence quickly by control, file type, or date

## Success Criteria
- Users can upload multiple file types (PDF, DOCX, XLSX, PNG, JPG, etc.)
- Files are stored securely in `/uploads` directory
- Evidence metadata is tracked in SQLite database
- Each evidence file can be linked to one or more controls
- Users can view which controls lack evidence
- Files can be previewed in-browser (PDFs, images)
- Search and filter functionality works smoothly
- All operations have proper error handling and validation

## Technical Scope

### Frontend Components
- `EvidenceLibrary.tsx` - Main page with file listing and filters
- `FileUpload.tsx` - Drag-and-drop upload component
- `EvidenceCard.tsx` - Display individual evidence items
- `ControlLinkDialog.tsx` - Modal to link files to controls
- `DocumentViewer.tsx` - Preview files (PDFs, images)
- `EvidenceGapReport.tsx` - Show controls without evidence
- `EvidenceFilters.tsx` - Filter by control, type, date

### Backend Components
- Upload middleware (multer configuration)
- Evidence routes and controllers
- Evidence service layer
- File validation utilities
- Database queries for evidence

### Database Schema
```prisma
model Evidence {
  id            String   @id @default(uuid())
  controlId     String
  fileName      String
  originalName  String
  filePath      String
  fileType      String
  fileSize      Int
  description   String?
  uploadedDate  DateTime @default(now())
  version       Int      @default(1)
  tags          String?  // JSON array of tags
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  control       Control  @relation(fields: [controlId], references: [id], onDelete: Cascade)
  
  @@map("evidence")
}
```

## File Storage Strategy
- Files stored in `/uploads` directory (outside `/server/src`)
- Organized by control family: `/uploads/AC/`, `/uploads/AU/`, etc.
- File naming: `{timestamp}_{sanitized-original-name}`
- Max file size: 10MB (configurable via environment variable)
- Allowed file types: PDF, DOCX, XLSX, PNG, JPG, JPEG, TXT, CSV

## Security Considerations
1. **File Validation**: Check file type, size, and scan for malicious content
2. **Sanitization**: Remove special characters from file names
3. **Access Control**: Only authenticated users can upload/view
4. **Path Traversal Prevention**: Validate file paths
5. **Virus Scanning**: Optional ClamAV integration (future enhancement)

## Phase 5 Breakdown
This phase is divided into 5 instructional documents:

1. **01_PHASE5_OVERVIEW.md** (this file) - Goals and architecture
2. **02_DATABASE_SETUP.md** - Prisma schema and migrations
3. **03_BACKEND_IMPLEMENTATION.md** - API routes, controllers, file handling
4. **04_FRONTEND_COMPONENTS.md** - React components for evidence management
5. **05_TESTING_CHECKLIST.md** - Testing scenarios and validation

## Implementation Order
1. Update database schema (Prisma)
2. Create backend upload middleware
3. Implement evidence API endpoints
4. Build frontend upload component
5. Create evidence library page
6. Add control linking functionality
7. Implement gap report
8. Add search and filtering
9. Test all features

## Dependencies Required

### Backend
```json
{
  "multer": "^1.4.5-lts.1",
  "uuid": "^9.0.0",
  "mime-types": "^2.1.35"
}
```

### Frontend
```json
{
  "react-dropzone": "^14.2.3",
  "@mui/icons-material": "^5.14.0"
}
```

## Environment Variables
Add to `.env`:
```env
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_PATH=./uploads
ALLOWED_FILE_TYPES=pdf,docx,xlsx,png,jpg,jpeg,txt,csv
```

## Dark Theme Color Reference
For consistency with existing UI:
- Background: `#121212`
- Paper: `#242424`
- Text Primary: `#E0E0E0`
- Text Secondary: `#B0B0B0`
- Success (uploaded): `#4CAF50`
- Warning (missing evidence): `#FF9800`

## API Endpoints to Implement
```
POST   /api/evidence/upload          - Upload files
GET    /api/evidence                 - List all evidence
GET    /api/evidence/:id             - Get evidence details
GET    /api/evidence/control/:id     - Get evidence for specific control
PUT    /api/evidence/:id             - Update evidence metadata
DELETE /api/evidence/:id             - Delete evidence
GET    /api/evidence/download/:id    - Download file
GET    /api/evidence/gaps            - Get controls without evidence
POST   /api/evidence/:id/link        - Link evidence to control
DELETE /api/evidence/:id/unlink/:controlId - Unlink from control
```

## Next Steps
Proceed to `02_DATABASE_SETUP.md` to begin implementation.
