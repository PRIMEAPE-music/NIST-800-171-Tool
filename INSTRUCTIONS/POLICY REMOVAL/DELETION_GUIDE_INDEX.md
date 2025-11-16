# M365 Policy Mapping Deletion Guide - Index

**Project:** NIST 800-171 Compliance Management Application  
**Task:** Complete removal of M365 policy mapping system  
**Date Created:** 2024-11-16  
**Optimized For:** Claude Code Execution

---

## 📋 Overview

This multi-phase guide provides complete instructions for removing all M365 policy mapping functionality from the compliance management application. The deletion preserves policy viewer and sync capabilities while removing all mapping relationships between policies and NIST controls.

---

## 🎯 What Will Be Deleted

### Backend Components
- ✅ `settingsMapper.service.ts` - Auto-mapping service
- ✅ `improvementActionMapping.service.ts` - Improvement action tracking
- ✅ Mapping-related API endpoints (recommendations, gap analysis, improvement actions)
- ✅ `control_policy_mappings` database table
- ✅ Mapping-related types and interfaces

### Frontend Components
- ✅ `M365SettingsTab.tsx` - Control settings display
- ✅ `M365RecommendationsTab.tsx` - Implementation recommendations
- ✅ Gap analysis widgets (if present)
- ✅ Mapping statistics displays

### Data Files
- ✅ `control-settings-mappings.json` - Keyword-based mappings
- ✅ `control-m365-mappings.json` - Policy type mappings

---

## 🔒 What Will Be Preserved

### Core Functionality
- ✅ Policy sync from M365 tenant (Intune, Purview, Azure AD)
- ✅ Policy viewer and search
- ✅ M365 authentication and integration
- ✅ `m365_policies` table and data
- ✅ Related Controls tab functionality
- ✅ Core compliance features (Assessments, POAMs, Evidence)

---

## 📁 Phase Structure

Execute phases in order. Each phase includes:
- Clear objectives
- Step-by-step instructions
- Verification checklists
- Troubleshooting guidance
- Rollback procedures

### Phase 0: Pre-Deletion Validation & Backup
**File:** `PHASE_0_PRE_DELETION_VALIDATION.md`  
**Time:** 10-15 minutes  
**Purpose:** Create backups and validate system state

**Key Steps:**
- Create git backup branch
- Backup database
- Document current state
- Verify application health

**Must Complete Before:** All other phases

---

### Phase 1: Database Schema Cleanup
**File:** `PHASE_1_DATABASE_SCHEMA_CLEANUP.md`  
**Time:** 10-15 minutes  
**Purpose:** Remove control_policy_mappings table from schema

**Key Steps:**
- Update Prisma schema
- Remove ControlPolicyMapping model
- Remove foreign key relations
- Generate and apply migration
- Regenerate Prisma Client

**Dependencies:** Phase 0 complete

---

### Phase 2: Backend Service Deletion
**File:** `PHASE_2_BACKEND_SERVICE_DELETION.md`  
**Time:** 15-20 minutes  
**Purpose:** Delete mapping services and update dependencies

**Key Steps:**
- Delete `settingsMapper.service.ts`
- Delete `improvementActionMapping.service.ts`
- Update `policySync.service.ts`
- Remove service imports
- Verify compilation

**Dependencies:** Phase 1 complete

---

### Phase 3: API Route Removal
**File:** `PHASE_3_API_ROUTE_REMOVAL.md`  
**Time:** 15-20 minutes  
**Purpose:** Remove mapping-related API endpoints

**Key Steps:**
- Remove recommendations endpoint
- Remove improvement actions endpoint
- Remove gap analysis endpoint
- Remove manual mapping endpoints
- Preserve policy viewer and sync routes
- Test endpoint responses

**Dependencies:** Phase 2 complete

---

### Phase 4: Frontend Component Cleanup
**File:** `PHASE_4_FRONTEND_COMPONENT_CLEANUP.md`  
**Time:** 15-20 minutes  
**Purpose:** Remove M365 mapping UI components

**Key Steps:**
- Delete `M365SettingsTab.tsx`
- Delete `M365RecommendationsTab.tsx`
- Update `ControlDetail.tsx` (remove tabs)
- Remove dashboard widgets
- Update navigation/routes
- Verify UI compilation

**Dependencies:** Phase 3 complete

---

### Phase 5: Data File Removal
**File:** `PHASE_5_DATA_FILE_REMOVAL.md`  
**Time:** 10-15 minutes  
**Purpose:** Remove mapping configuration data files

**Key Steps:**
- Delete `control-settings-mappings.json`
- Delete `control-m365-mappings.json`
- Remove data file loading code
- Update documentation
- Verify no file references remain

**Dependencies:** Phase 4 complete

---

### Phase 6: Type Definition Cleanup
**File:** `PHASE_6_TYPE_DEFINITION_CLEANUP.md`  
**Time:** 15-20 minutes  
**Purpose:** Remove mapping-related TypeScript types

**Key Steps:**
- Delete `settingsMapper.types.ts`
- Remove mapping types from `m365.types.ts`
- Update type imports
- Preserve essential types (PolicyType, M365Policy)
- Verify compilation

**Dependencies:** Phase 5 complete

---

### Phase 7: Post-Deletion Verification
**File:** `PHASE_7_POST_DELETION_VERIFICATION.md`  
**Time:** 20-30 minutes  
**Purpose:** Comprehensive verification and testing

**Key Steps:**
- Clean builds (frontend & backend)
- Verify database schema
- Confirm file deletions
- Test API endpoints
- Manual UI testing
- Search for remaining references
- Generate deletion summary
- Commit changes

**Dependencies:** All previous phases complete

---

## 🚀 Execution Instructions

### For Claude Code

Execute phases sequentially:

```bash
# Phase 0
cat PHASE_0_PRE_DELETION_VALIDATION.md

# After Phase 0 completion:
cat PHASE_1_DATABASE_SCHEMA_CLEANUP.md

# Continue through all phases...
```

### For Manual Execution

1. Read through entire guide first
2. Execute phases in order
3. Complete all verification steps
4. Do not skip phases
5. Document any issues encountered

---

## ⚠️ Critical Warnings

### Before Starting

1. **Backup First:** Always complete Phase 0 before any deletions
2. **Sequential Execution:** Phases must be completed in order
3. **Verify Each Step:** Don't skip verification checklists
4. **No Shortcuts:** Skipping steps may cause issues

### During Execution

1. **Stop on Errors:** Don't continue if verification fails
2. **Read Carefully:** Follow FIND/REPLACE patterns exactly
3. **Check References:** Ensure all imports are updated
4. **Test Frequently:** Verify compilation after major changes

### After Completion

1. **Comprehensive Testing:** Complete all Phase 7 tests
2. **Manual Verification:** Test UI manually in browser
3. **Document Issues:** Note any problems encountered
4. **Commit Changes:** Ensure all changes are committed

---

## 🔄 Rollback Procedures

### Quick Rollback

```bash
cd /home/claude
git checkout backup-before-mapping-deletion
cd server
cp prisma/dev.db.backup-YYYYMMDD-HHMMSS prisma/dev.db
npx prisma generate
npm install
npm run build
```

### Partial Rollback

Each phase includes specific rollback instructions for that phase only.

---

## 📊 Progress Tracking

Use this checklist to track progress:

- [ ] Phase 0: Pre-Deletion Validation & Backup
- [ ] Phase 1: Database Schema Cleanup
- [ ] Phase 2: Backend Service Deletion
- [ ] Phase 3: API Route Removal
- [ ] Phase 4: Frontend Component Cleanup
- [ ] Phase 5: Data File Removal
- [ ] Phase 6: Type Definition Cleanup
- [ ] Phase 7: Post-Deletion Verification

---

## 🎓 Key Concepts

### What is Being Removed

**Auto-Mapping System:**
- Keyword-based automatic mapping of M365 policies to NIST controls
- Individual setting validation against control requirements
- Confidence scoring (High/Medium/Low)

**Gap Analysis:**
- Identification of missing or non-compliant settings
- Control coverage metrics
- Remediation recommendations

**Improvement Actions:**
- Microsoft improvement action tracking
- Platform-specific compliance monitoring
- Policy-based implementation status

### What is Being Kept

**Policy Management:**
- Sync policies from M365 tenant
- View all policies and configurations
- Search and filter policies
- Azure AD authentication

**Core Compliance:**
- NIST control library
- Assessments and scoring
- POAMs (Plans of Action)
- Evidence management
- Reporting

---

## 📖 File Reference

### Phase Files (7 files)
1. `PHASE_0_PRE_DELETION_VALIDATION.md`
2. `PHASE_1_DATABASE_SCHEMA_CLEANUP.md`
3. `PHASE_2_BACKEND_SERVICE_DELETION.md`
4. `PHASE_3_API_ROUTE_REMOVAL.md`
5. `PHASE_4_FRONTEND_COMPONENT_CLEANUP.md`
6. `PHASE_5_DATA_FILE_REMOVAL.md`
7. `PHASE_6_TYPE_DEFINITION_CLEANUP.md`
8. `PHASE_7_POST_DELETION_VERIFICATION.md`

### Supporting Files
- `DELETION_GUIDE_INDEX.md` (this file)
- `DELETION_SUMMARY.md` (generated in Phase 7)

---

## 🆘 Support Information

### Common Issues

**Build Failures:**
- Clear node_modules and reinstall
- Delete dist/build folders
- Regenerate Prisma Client

**Type Errors:**
- Check for remaining imports
- Verify type definitions updated
- Clear TypeScript cache

**Runtime Errors:**
- Check browser console
- Review server logs
- Search for remaining references

**Database Issues:**
- Verify migration applied
- Check schema consistency
- Restore from backup if needed

### Getting Help

1. Check troubleshooting section in each phase
2. Search for error messages in codebase
3. Review phase-specific rollback procedures
4. Restore from backup if necessary

---

## ✅ Success Criteria

The deletion is successful when:

1. **All phases completed** with passing verification
2. **Application builds** without errors (frontend & backend)
3. **Application runs** without crashes or console errors
4. **No M365 mapping UI** visible (tabs removed from controls)
5. **Deleted endpoints** return 404 errors
6. **Preserved endpoints** work correctly (policy sync, viewer)
7. **No orphaned code** (imports, references, types)
8. **Database clean** (mapping table removed, other data intact)
9. **Manual testing passed** (UI verified in browser)
10. **Changes committed** to git

---

## 📅 Estimated Total Time

| Phase | Time | Cumulative |
|-------|------|------------|
| Phase 0 | 10-15 min | 15 min |
| Phase 1 | 10-15 min | 30 min |
| Phase 2 | 15-20 min | 50 min |
| Phase 3 | 15-20 min | 70 min |
| Phase 4 | 15-20 min | 90 min |
| Phase 5 | 10-15 min | 105 min |
| Phase 6 | 15-20 min | 125 min |
| Phase 7 | 20-30 min | 155 min |

**Total: ~2.5 hours** (with testing and verification)

---

## 🔮 After Completion

### Immediate Next Steps

1. Review `DELETION_SUMMARY.md` for complete record
2. Test application thoroughly in development
3. Verify all core features work correctly
4. Document any issues or unexpected behaviors

### Future Remapping

When ready to implement new mapping system:

1. **Design:** Plan new mapping architecture
2. **Database:** Create new schema for mappings
3. **Backend:** Implement new services and APIs
4. **Frontend:** Build new UI components
5. **Data:** Define new mapping configurations
6. **Testing:** Comprehensive testing of new system

---

## 📝 Notes

- This guide assumes familiarity with the codebase
- All file paths are relative to project root
- Commands assume Unix/Linux/macOS environment
- Adjust commands for Windows if needed
- Some paths may vary based on project structure

---

## 🏁 Ready to Begin?

1. ✅ Read this index completely
2. ✅ Understand what will be deleted/preserved
3. ✅ Allocate 2-3 hours for completion
4. ✅ Ensure no other work in progress
5. ✅ Start with Phase 0

**Begin with:** `PHASE_0_PRE_DELETION_VALIDATION.md`

---

**Good luck! 🚀**
