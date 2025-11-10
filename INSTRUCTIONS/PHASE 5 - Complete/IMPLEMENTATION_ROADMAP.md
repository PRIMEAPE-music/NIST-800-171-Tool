# Phase 5: Evidence Management - Visual Implementation Roadmap

## 🗺️ Implementation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 5: EVIDENCE MANAGEMENT                 │
│                    Estimated Time: 6-10 hours                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: DATABASE SETUP (30 minutes)                             │
│  └─ Read: 02_DATABASE_SETUP.md                                   │
│     ├─ Update schema.prisma with Evidence model                  │
│     ├─ Add evidence relation to Control model                    │
│     ├─ Run: npx prisma migrate dev --name add_evidence_model     │
│     ├─ Create: server/src/types/evidence.types.ts                │
│     └─ Test: database operations                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: BACKEND API (2-3 hours)                                 │
│  └─ Read: 03_BACKEND_IMPLEMENTATION.md                           │
│     ├─ Install: multer, uuid, mime-types                         │
│     ├─ Create: upload.middleware.ts                              │
│     ├─ Create: file-validator.ts                                 │
│     ├─ Create: file-helpers.ts                                   │
│     ├─ Create: evidence.service.ts                               │
│     ├─ Create: evidence.controller.ts                            │
│     ├─ Create: evidence.routes.ts                                │
│     ├─ Update: Express app with routes                           │
│     └─ Test: All API endpoints with cURL                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: FRONTEND UI (2-3 hours)                                 │
│  └─ Read: 04_FRONTEND_COMPONENTS.md                              │
│     ├─ Install: react-dropzone                                   │
│     ├─ Create: client/src/types/evidence.types.ts                │
│     ├─ Create: evidenceService.ts                                │
│     ├─ Create: useEvidence.ts hook                               │
│     ├─ Create: FileUpload.tsx                                    │
│     ├─ Create: EvidenceCard.tsx                                  │
│     ├─ Create: EvidenceLibrary.tsx                               │
│     ├─ Create: EvidenceGapReport.tsx                             │
│     ├─ Update: App.tsx with routes                               │
│     └─ Test: All UI components                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: COMPREHENSIVE TESTING (2-4 hours)                       │
│  └─ Read: 05_TESTING_CHECKLIST.md                                │
│     ├─ Backend API Tests (20 test cases)                         │
│     ├─ Frontend UI Tests (19 test cases)                         │
│     ├─ Integration Tests (3 test cases)                          │
│     ├─ Performance Tests (3 test cases)                          │
│     ├─ Security Tests (2 test cases)                             │
│     ├─ Accessibility Tests (2 test cases)                        │
│     └─ Sign-off Checklist                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ✅ PHASE 5 COMPLETE - Ready for Phase 6!                        │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 File Creation Matrix

### Backend Files (9 files)
| File | Location | Purpose | Est. Time |
|------|----------|---------|-----------|
| schema.prisma | `server/src/models/` | Evidence model | 10 min |
| evidence.types.ts | `server/src/types/` | TypeScript interfaces | 10 min |
| upload.middleware.ts | `server/src/middleware/` | Multer config | 30 min |
| file-validator.ts | `server/src/utils/` | File validation | 20 min |
| file-helpers.ts | `server/src/utils/` | File operations | 20 min |
| evidence.service.ts | `server/src/services/` | Business logic | 45 min |
| evidence.controller.ts | `server/src/controllers/` | Request handlers | 30 min |
| evidence.routes.ts | `server/src/routes/` | API routes | 15 min |
| error.middleware.ts | `server/src/middleware/` | Error handling | 10 min |

### Frontend Files (8 files)
| File | Location | Purpose | Est. Time |
|------|----------|---------|-----------|
| evidence.types.ts | `client/src/types/` | TypeScript interfaces | 10 min |
| evidenceService.ts | `client/src/services/` | API client | 30 min |
| useEvidence.ts | `client/src/hooks/` | React hooks | 30 min |
| FileUpload.tsx | `client/src/components/evidence/` | Upload UI | 45 min |
| EvidenceCard.tsx | `client/src/components/evidence/` | Card display | 30 min |
| EvidenceLibrary.tsx | `client/src/pages/` | Main page | 45 min |
| EvidenceGapReport.tsx | `client/src/pages/` | Gap report | 30 min |
| App.tsx | `client/src/` | Route updates | 5 min |

**Total Files**: 17 files
**Total Estimated Time**: 6-10 hours

## 🎯 Feature Completion Checklist

### Core Features
- [ ] File upload (single)
- [ ] File upload (multiple)
- [ ] Drag-and-drop interface
- [ ] File type validation
- [ ] File size validation
- [ ] View evidence library
- [ ] Search evidence
- [ ] Filter evidence
- [ ] Download files
- [ ] Delete files
- [ ] Preview files (PDF/images)
- [ ] Link evidence to controls
- [ ] View evidence on control pages
- [ ] Gap analysis report
- [ ] Evidence statistics

### Technical Requirements
- [ ] RESTful API endpoints
- [ ] Database schema
- [ ] File storage system
- [ ] Error handling
- [ ] Input validation
- [ ] Type safety (TypeScript)
- [ ] React Query integration
- [ ] Dark theme styling
- [ ] Responsive design
- [ ] Loading states
- [ ] Empty states
- [ ] Confirmation dialogs

### Security Features
- [ ] File type whitelist
- [ ] File size limits
- [ ] Path traversal prevention
- [ ] MIME type validation
- [ ] Filename sanitization
- [ ] Secure file storage

## 📦 Dependencies Overview

### Backend Dependencies
```json
{
  "multer": "^1.4.5-lts.1",      // File upload middleware
  "uuid": "^9.0.0",               // Unique ID generation
  "mime-types": "^2.1.35"         // MIME type utilities
}
```

### Frontend Dependencies
```json
{
  "react-dropzone": "^14.2.3"     // Drag-and-drop file upload
}
```

## 🔄 Data Flow Diagram

```
┌─────────────┐
│   Browser   │
│   (React)   │
└──────┬──────┘
       │ 1. User selects files
       │
       ↓
┌─────────────────┐
│  FileUpload     │
│  Component      │
└──────┬──────────┘
       │ 2. POST /api/evidence/upload
       │    FormData + files
       ↓
┌─────────────────┐
│  Express        │
│  Server         │
└──────┬──────────┘
       │ 3. Multer middleware
       │    validates & saves to disk
       ↓
┌─────────────────┐
│  Evidence       │
│  Controller     │
└──────┬──────────┘
       │ 4. Calls service layer
       │
       ↓
┌─────────────────┐
│  Evidence       │
│  Service        │
└──────┬──────────┘
       │ 5. Writes to database
       │
       ↓
┌─────────────────┐
│  SQLite DB      │
│  (Prisma)       │
└──────┬──────────┘
       │ 6. Returns evidence object
       │
       ↓
┌─────────────────┐
│  Response       │
│  to Browser     │
└─────────────────┘
```

## 🗂️ File Storage Structure

```
project-root/
├── uploads/                    # Evidence files directory
│   ├── AC/                     # Access Control family
│   │   ├── 1234567890_abc_policy.pdf
│   │   └── 1234567891_xyz_screenshot.png
│   ├── AU/                     # Audit family
│   │   └── 1234567892_def_audit.xlsx
│   ├── IA/                     # Identification & Auth family
│   │   └── 1234567893_ghi_mfa.docx
│   └── GENERAL/                # Unassigned files
│       └── 1234567894_jkl_document.pdf
└── database/
    └── compliance.db           # SQLite database
```

## 🎨 UI Component Hierarchy

```
App
 └─ EvidenceLibrary (Page)
     ├─ Header
     │   ├─ Title
     │   ├─ Refresh Button
     │   └─ Upload Button
     ├─ Search Bar
     ├─ Evidence Grid
     │   └─ EvidenceCard (Component)
     │       ├─ File Icon
     │       ├─ File Name
     │       ├─ Control Chip
     │       ├─ Description
     │       └─ Actions
     │           ├─ View Button
     │           ├─ Download Button
     │           └─ Delete Button
     └─ Upload Dialog
         └─ FileUpload (Component)
             ├─ Dropzone
             ├─ File List
             └─ Upload Button

 └─ EvidenceGapReport (Page)
     ├─ Header
     ├─ Summary Card
     └─ Gap Table
         └─ Table Rows
             ├─ Control ID
             ├─ Family
             ├─ Title
             ├─ Priority
             └─ Upload Button
```

## 🔐 Security Layers

```
┌─────────────────────────────────────────┐
│  Layer 1: Frontend Validation           │
│  - File type check                      │
│  - File size check                      │
│  - User feedback                        │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Layer 2: Multer Middleware             │
│  - File filter                          │
│  - Size limits                          │
│  - Destination validation               │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Layer 3: File Validator                │
│  - MIME type validation                 │
│  - Path traversal check                 │
│  - Filename sanitization                │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Layer 4: Service Layer                 │
│  - File existence check                 │
│  - Database validation                  │
│  - Business logic checks                │
└─────────────────────────────────────────┘
```

## 📈 Success Metrics

After Phase 5 completion:

- ✅ **Functionality**: All 15 core features working
- ✅ **Testing**: 52/52 test cases passing
- ✅ **Performance**: Page loads < 3 seconds
- ✅ **Security**: All 6 security checks implemented
- ✅ **Code Quality**: 0 TypeScript errors, 0 console errors
- ✅ **Documentation**: All code documented
- ✅ **UI/UX**: Consistent dark theme, responsive design

## 🎓 Learning Objectives

By completing Phase 5, you will:

1. ✅ Implement file upload with Multer
2. ✅ Handle multipart form data
3. ✅ Validate file types and sizes
4. ✅ Store files securely on disk
5. ✅ Create RESTful file management APIs
6. ✅ Build drag-and-drop UI with react-dropzone
7. ✅ Implement React Query for data management
8. ✅ Handle file downloads in browser
9. ✅ Implement gap analysis logic
10. ✅ Create responsive grid layouts

## 🚀 Ready to Start?

1. **Read** the README.md for overview
2. **Follow** each document sequentially
3. **Check off** items as you complete them
4. **Test** each component as you build it
5. **Validate** with the testing checklist
6. **Document** any issues or deviations

**Let's build an amazing evidence management system! 💪**
