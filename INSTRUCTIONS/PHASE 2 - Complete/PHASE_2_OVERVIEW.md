# Phase 2: Core Control Management - Overview

## Phase Summary
**Goal:** Full CRUD operations for controls and basic assessment functionality  
**Duration:** Weeks 3-4  
**Prerequisites:** Phase 1 completed (project structure, database, basic UI framework)

## Key Update: NIST 800-171r3
This project uses **NIST SP 800-171 Revision 3** (released May 2024), not Revision 2. All control references, requirement text, and mappings should align with r3.

## Phase 2 Deliverables
1. ✅ Control Library page with full CRUD operations
2. ✅ Control Detail page with comprehensive management
3. ✅ Dashboard with compliance statistics and visualizations
4. ✅ Complete backend API for controls and statistics

## Sub-Phase Breakdown

### 2.1 - Backend Foundation
**File:** `PHASE_2.1_BACKEND_API.md`
- Database models and Prisma schema finalization
- Control CRUD API endpoints
- Statistics calculation service
- Error handling and validation

**Dependencies:** Phase 1 database structure

### 2.2 - Control Library UI
**File:** `PHASE_2.2_CONTROL_LIBRARY.md`
- Control table/grid component
- Advanced filtering system (family, status, priority)
- Search functionality
- Sorting and pagination
- Bulk operations

**Dependencies:** 2.1 Backend API

### 2.3 - Control Detail Page
**File:** `PHASE_2.3_CONTROL_DETAIL.md`
- Detailed control view
- Status management workflow
- Implementation notes editor
- Change history tracking
- Basic evidence placeholder
- Related controls

**Dependencies:** 2.1 Backend API

### 2.4 - Dashboard & Statistics
**File:** `PHASE_2.4_DASHBOARD.md`
- Compliance overview cards
- Family breakdown charts
- Recent activity feed
- Risk summary
- Quick statistics

**Dependencies:** 2.1 Backend API, 2.2 Control Library

## Development Order
Execute in sequence for optimal dependency management:

```
Phase 2.1 → Phase 2.2 → Phase 2.3 → Phase 2.4
(Backend)   (Library)   (Details)   (Dashboard)
```

## Testing Checkpoints

### After 2.1 (Backend):
- [ ] All API endpoints respond correctly
- [ ] Database queries return expected data
- [ ] Validation works for all inputs
- [ ] Statistics calculate accurately

### After 2.2 (Control Library):
- [ ] All 110 controls display correctly
- [ ] Filters work in combination
- [ ] Search returns relevant results
- [ ] Sorting works on all columns
- [ ] Bulk operations execute successfully

### After 2.3 (Control Detail):
- [ ] Individual control loads completely
- [ ] Status updates save and reflect immediately
- [ ] Notes persist across sessions
- [ ] Change history tracks all modifications
- [ ] Navigation between controls works smoothly

### After 2.4 (Dashboard):
- [ ] Statistics match actual database state
- [ ] Charts render data correctly
- [ ] Activity feed shows recent changes
- [ ] All links navigate to correct pages
- [ ] Data refreshes appropriately

## Success Criteria
Phase 2 is complete when:
1. Users can view all 110 NIST 800-171r3 controls
2. Users can filter, search, and sort controls effectively
3. Users can update control status and add implementation notes
4. Dashboard accurately reflects compliance state
5. All changes persist to database
6. UI is responsive and follows dark theme guidelines
7. No console errors during normal operation

## Common Pitfalls to Avoid
1. **Hardcoding control data** - Always fetch from database
2. **Missing error handling** - Every API call needs try/catch
3. **Poor performance with 110 controls** - Implement pagination/virtualization
4. **Inconsistent status values** - Use TypeScript enums strictly
5. **Not validating inputs** - Both client and server validation required
6. **Forgetting loading states** - Every async operation needs loading UI
7. **Breaking dark theme** - Test all new components in dark mode

## Key Technical Decisions

### State Management
- React Query for server state (controls, statistics)
- Local state for UI (filters, sort, pagination)
- Context for global app state (theme, user preferences)

### Data Fetching Strategy
- Initial load: Fetch all controls (cached)
- Filters/search: Client-side for speed
- Statistics: Real-time calculation from server
- Pagination: Virtual scrolling for large lists

### Component Architecture
- Page-level components in `/pages`
- Reusable UI in `/components/common`
- Feature-specific in `/components/controls`, `/components/dashboard`
- Custom hooks in `/hooks`

### API Design Pattern
```
GET    /api/controls           - List all controls (with query params)
GET    /api/controls/:id       - Get single control
PUT    /api/controls/:id       - Update control
PATCH  /api/controls/:id/status - Update status only
GET    /api/controls/stats     - Get statistics
POST   /api/controls/bulk      - Bulk operations
```

## Integration Points for Future Phases

### Phase 3 (Assessment):
- Control detail page will add assessment section
- Dashboard will show assessment metrics
- API will extend with assessment endpoints

### Phase 4 (POAM):
- Controls will link to POAM items
- Dashboard will show POAM statistics
- Control detail will display related POAMs

### Phase 5 (Evidence):
- Control detail will enable evidence upload
- Evidence count will show in library
- Dashboard will track evidence coverage

### Phase 6 (M365):
- Controls will display M365 policy mappings
- Auto-status updates based on M365 compliance
- Dashboard will show M365 sync status

## File Organization Reference

```
client/src/
├── pages/
│   ├── Dashboard.tsx          # 2.4
│   ├── ControlLibrary.tsx     # 2.2
│   └── ControlDetail.tsx      # 2.3
├── components/
│   ├── controls/
│   │   ├── ControlTable.tsx
│   │   ├── ControlFilters.tsx
│   │   ├── ControlCard.tsx
│   │   └── StatusBadge.tsx
│   ├── dashboard/
│   │   ├── ComplianceOverview.tsx
│   │   ├── FamilyBreakdown.tsx
│   │   └── RecentActivity.tsx
│   └── common/
│       ├── LoadingSpinner.tsx
│       ├── ErrorMessage.tsx
│       └── EmptyState.tsx
└── services/
    ├── controlService.ts      # 2.1
    └── statisticsService.ts   # 2.1

server/src/
├── controllers/
│   ├── controlController.ts   # 2.1
│   └── statsController.ts     # 2.1
├── services/
│   ├── controlService.ts      # 2.1
│   └── statisticsService.ts   # 2.1
└── routes/
    └── controlRoutes.ts       # 2.1
```

## Next Steps After Phase 2
1. Review all completed features
2. User acceptance testing
3. Performance optimization if needed
4. Begin Phase 3 planning (Assessment & Gap Analysis)

---

**Ready to Begin?** Start with `PHASE_2.1_BACKEND_API.md`
