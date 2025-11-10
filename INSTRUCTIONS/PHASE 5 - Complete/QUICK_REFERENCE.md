# Phase 5: Quick Reference Guide

## 📖 How to Use These Documents

### For Claude Code
```bash
# Navigate to the instructions directory
cd /path/to/phase5-instructions

# Read documents in order:
# 1. README.md - Start here for overview
# 2. 01_PHASE5_OVERVIEW.md - Understand the goals
# 3. 02_DATABASE_SETUP.md - Set up database
# 4. 03_BACKEND_IMPLEMENTATION.md - Build API
# 5. 04_FRONTEND_COMPONENTS.md - Build UI
# 6. 05_TESTING_CHECKLIST.md - Validate everything
# 7. IMPLEMENTATION_ROADMAP.md - Visual guide
```

### Key Commands

#### Database Setup
```bash
cd server
npx prisma migrate dev --name add_evidence_model
npx prisma generate
npx ts-node src/scripts/test-evidence-model.ts
```

#### Backend Dependencies
```bash
cd server
npm install multer uuid mime-types
npm install -D @types/multer
```

#### Frontend Dependencies
```bash
cd client
npm install react-dropzone
```

#### Run Development Servers
```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd client && npm run dev
```

#### Test API with cURL
```bash
# Upload evidence
curl -X POST http://localhost:3001/api/evidence/upload \
  -F "files=@/path/to/file.pdf" \
  -F "controlId=YOUR_CONTROL_UUID" \
  -F "description=Test file"

# Get all evidence
curl http://localhost:3001/api/evidence

# Get evidence gaps
curl http://localhost:3001/api/evidence/gaps
```

## 🎯 Critical Success Factors

### Must-Have Features
1. ✅ File upload (single & multiple)
2. ✅ File validation (type & size)
3. ✅ Evidence library view
4. ✅ Download functionality
5. ✅ Delete functionality
6. ✅ Gap analysis report

### Must-Have Security
1. ✅ File type whitelist
2. ✅ Size limits (10MB)
3. ✅ Path traversal prevention
4. ✅ MIME type validation
5. ✅ Filename sanitization

### Must-Pass Tests
- ✅ All 20 backend API tests
- ✅ All 19 frontend UI tests
- ✅ All 3 integration tests
- ✅ All 2 security tests

## 📁 File Quick Reference

### Database Files
```
server/src/models/schema.prisma          [UPDATE]
server/src/types/evidence.types.ts       [CREATE]
```

### Backend Files
```
server/src/middleware/upload.middleware.ts      [CREATE]
server/src/utils/file-validator.ts              [CREATE]
server/src/utils/file-helpers.ts                [CREATE]
server/src/services/evidence.service.ts         [CREATE]
server/src/controllers/evidence.controller.ts   [CREATE]
server/src/routes/evidence.routes.ts            [CREATE]
server/src/middleware/error.middleware.ts       [UPDATE]
server/src/index.ts or app.ts                   [UPDATE]
```

### Frontend Files
```
client/src/types/evidence.types.ts              [CREATE]
client/src/services/evidenceService.ts          [CREATE]
client/src/hooks/useEvidence.ts                 [CREATE]
client/src/components/evidence/FileUpload.tsx   [CREATE]
client/src/components/evidence/EvidenceCard.tsx [CREATE]
client/src/pages/EvidenceLibrary.tsx            [CREATE]
client/src/pages/EvidenceGapReport.tsx          [CREATE]
client/src/App.tsx                              [UPDATE]
```

## 🚨 Common Pitfalls

### 1. Uploads Directory Missing
**Problem**: Files fail to upload with ENOENT error
**Solution**: 
```bash
mkdir -p uploads
chmod 755 uploads
```

### 2. Multer Not Handling Errors
**Problem**: 400 errors not properly formatted
**Solution**: Update error middleware to handle MulterError

### 3. MIME Type Mismatch
**Problem**: .pdf file rejected even though it's valid
**Solution**: Check MIME type validation in upload.middleware.ts

### 4. React Query Not Updating
**Problem**: Evidence doesn't appear after upload
**Solution**: Call `invalidateQueries` in mutation `onSuccess`

### 5. TypeScript Errors After Migration
**Problem**: Evidence type not found
**Solution**: 
```bash
npx prisma generate
# Restart TypeScript server
```

## 🎨 Dark Theme Colors (Quick Reference)

```typescript
// Backgrounds
background.default: '#121212'
background.paper: '#242424'

// Text
text.primary: '#E0E0E0'
text.secondary: '#B0B0B0'

// Status Colors
success: '#4CAF50'  // Uploaded
warning: '#FF9800'  // Missing evidence
error: '#F44336'    // Error state
info: '#2196F3'     // Info state

// Borders
divider: 'rgba(255, 255, 255, 0.12)'
```

## 📊 Progress Checklist

### Day 1 (2-3 hours)
- [ ] Read all documentation
- [ ] Set up database schema
- [ ] Run migrations
- [ ] Create TypeScript types
- [ ] Install backend dependencies
- [ ] Create upload middleware
- [ ] Create file utilities

### Day 2 (2-3 hours)
- [ ] Create evidence service
- [ ] Create evidence controller
- [ ] Create evidence routes
- [ ] Test all API endpoints
- [ ] Install frontend dependencies
- [ ] Create API service client
- [ ] Create custom hooks

### Day 3 (2-3 hours)
- [ ] Build FileUpload component
- [ ] Build EvidenceCard component
- [ ] Build EvidenceLibrary page
- [ ] Build EvidenceGapReport page
- [ ] Update routes
- [ ] Test all UI features
- [ ] Run full testing checklist

### Day 4 (1-2 hours)
- [ ] Fix any bugs found
- [ ] Optimize performance
- [ ] Complete documentation
- [ ] Final validation
- [ ] Ready for Phase 6!

## 🔍 Key Concepts

### Multer
- Express middleware for handling multipart/form-data
- Used for file uploads
- Configurable storage, filters, limits

### React Query
- Server state management
- Automatic caching
- Background refetching
- Mutation handling

### Prisma
- Type-safe ORM
- Auto-generated types
- Migration system
- Query builder

### React Dropzone
- Drag-and-drop file upload
- File type validation
- Multiple file support
- Customizable UI

## 📞 Need Help?

### Where to Look
1. **Error in API**: Check `03_BACKEND_IMPLEMENTATION.md`
2. **Error in UI**: Check `04_FRONTEND_COMPONENTS.md`
3. **Database issue**: Check `02_DATABASE_SETUP.md`
4. **Testing question**: Check `05_TESTING_CHECKLIST.md`
5. **General confusion**: Check `README.md` and `IMPLEMENTATION_ROADMAP.md`

### Troubleshooting Steps
1. Check console for errors
2. Verify file paths are correct
3. Ensure dependencies are installed
4. Restart dev servers
5. Clear browser cache
6. Regenerate Prisma client

## ✅ Definition of Done

Phase 5 is complete when:

- [ ] All 17 files created/updated
- [ ] All dependencies installed
- [ ] All 52 tests pass
- [ ] 0 TypeScript errors
- [ ] 0 console errors
- [ ] Can upload files successfully
- [ ] Can view evidence library
- [ ] Can download files
- [ ] Can delete files
- [ ] Gap report shows correct data
- [ ] UI follows dark theme
- [ ] All code documented
- [ ] Ready to demo

## 🎉 Success Criteria

You'll know Phase 5 is successful when:

1. **It works**: Upload, view, download, delete all work
2. **It's tested**: All 52 test cases pass
3. **It's secure**: All validation in place
4. **It's clean**: No errors, warnings, or console logs
5. **It's styled**: Consistent dark theme throughout
6. **It's documented**: Code is clear and commented
7. **It's ready**: Can proceed to Phase 6 confidently

---

## 🚀 Let's Build!

**Remember**: Work sequentially, test incrementally, and check off items as you go.

**You've got this!** 💪

---

**Document Version**: 1.0  
**Last Updated**: November 2024  
**NIST Version**: 800-171 Rev 3  
**Estimated Time**: 6-10 hours
