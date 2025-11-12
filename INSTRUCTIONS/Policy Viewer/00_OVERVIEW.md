# Policy Viewer Implementation - Overview

## Purpose
Add a comprehensive Policy Settings Viewer page to the NIST 800-171 Compliance Tracker that displays all Microsoft 365 policy configurations (Intune, Purview, Azure AD) in a user-friendly, organized interface.

## Goals
1. Display all synced M365 policy details in readable format
2. Organize policies by type with tabbed navigation
3. Show policy-to-NIST control mappings
4. Enable search, filter, and export capabilities
5. Provide real-time sync status
6. Allow drill-down into individual policy settings

## Implementation Phases

### Phase 1: Backend API Enhancements
**File:** `01_BACKEND_API.md`
- Add policy detail endpoints
- Create policy parsing services
- Add export functionality
- Enhance existing m365 routes

### Phase 2: Frontend Components
**File:** `02_FRONTEND_COMPONENTS.md`
- Create PolicyViewer page structure
- Build policy card components
- Implement tab navigation
- Add search and filter UI

### Phase 3: Policy Type Viewers
**File:** `03_POLICY_VIEWERS.md`
- Intune policy viewer
- Purview policy viewer
- Azure AD policy viewer
- Policy detail modal

### Phase 4: Integration & Polish
**File:** `04_INTEGRATION.md`
- Add route to navigation
- Connect to existing M365 service
- Add sync indicators
- Implement export functionality
- Testing checklist

## Project Structure

```
├── server/src/
│   ├── routes/
│   │   └── m365.routes.ts (ENHANCE)
│   ├── services/
│   │   └── policyViewer.service.ts (NEW)
│   └── types/
│       └── policyViewer.types.ts (NEW)
│
├── client/src/
│   ├── pages/
│   │   └── PolicyViewer.tsx (NEW)
│   ├── components/
│   │   └── policy-viewer/
│   │       ├── PolicyTabs.tsx (NEW)
│   │       ├── IntunePolicyCard.tsx (NEW)
│   │       ├── PurviewPolicyCard.tsx (NEW)
│   │       ├── AzureADPolicyCard.tsx (NEW)
│   │       ├── PolicyDetailModal.tsx (NEW)
│   │       ├── PolicySearchBar.tsx (NEW)
│   │       └── SyncStatusIndicator.tsx (NEW)
│   └── services/
│       └── policyViewer.service.ts (NEW)
```

## Tech Stack Additions
- **react-json-view**: For displaying complex policy JSON
- **react-syntax-highlighter**: For formatted JSON display
- **date-fns**: For date formatting
- **Export**: Use existing report generation patterns

## Color Scheme (Existing Dark Theme)
- Background: #121212, #1E1E1E, #242424
- Text: #E0E0E0, #B0B0B0
- Intune accent: #42A5F5 (blue)
- Purview accent: #AB47BC (purple)
- Azure AD accent: #66BB6A (green)
- Active/Synced: #4CAF50
- Inactive: #757575

## Key Features

### 1. Policy Organization
- Three main tabs: Intune | Purview | Azure AD
- Each tab shows relevant policies as expandable cards
- Cards show: Policy name, description, last synced, active status

### 2. Policy Details
- Click card to expand or open modal with full settings
- Formatted JSON viewer for complex configurations
- Highlight important security settings
- Show mapped NIST controls

### 3. Search & Filter
- Search across all policy names/descriptions
- Filter by: Active/Inactive, Policy Type, Last Synced Date
- Filter by mapped NIST control

### 4. Sync Management
- Display last sync time
- Show sync status indicator (green=recent, yellow=stale, red=error)
- Manual sync button
- Auto-refresh option

### 5. Export Capabilities
- Export selected policies to PDF
- Export to Excel spreadsheet
- Export policy-to-control mappings
- Generate policy summary report

## Dependencies

### Backend
```json
{
  "date-fns": "^2.30.0" // Date formatting
}
```

### Frontend
```json
{
  "react-json-view": "^1.21.3",
  "react-syntax-highlighter": "^15.5.0",
  "date-fns": "^2.30.0"
}
```

## Implementation Order
1. **Phase 1** (Backend) - Build API endpoints and services
2. **Phase 2** (Frontend) - Create page structure and base components
3. **Phase 3** (Policy Viewers) - Build policy-type-specific viewers
4. **Phase 4** (Integration) - Connect everything and polish

## Estimated Implementation Time
- Phase 1: 2-3 hours
- Phase 2: 2-3 hours
- Phase 3: 3-4 hours
- Phase 4: 1-2 hours
- **Total: 8-12 hours**

## Success Criteria
- ✅ All synced policies visible in organized tabs
- ✅ Policy settings displayed in readable format
- ✅ Search and filter work correctly
- ✅ NIST control mappings displayed
- ✅ Sync status accurate
- ✅ Export functions generate valid files
- ✅ No performance issues with large policy sets
- ✅ Mobile responsive design

## Testing Checklist
- [ ] Backend endpoints return correct data
- [ ] Policy parsing handles all data types
- [ ] Frontend displays all policy types correctly
- [ ] Search filters work across all tabs
- [ ] Export generates valid files
- [ ] Sync indicator updates appropriately
- [ ] Performance with 50+ policies
- [ ] Error handling for missing data
- [ ] Responsive design on mobile/tablet

## Notes for Implementation
- Use existing dark theme colors consistently
- Follow project TypeScript strict mode conventions
- Reuse existing MUI components where possible
- Handle cases where M365 sync hasn't run yet
- Add loading skeletons for better UX
- Implement error boundaries
- Add helpful tooltips for complex settings
- Consider virtualization for large policy lists

## Next Steps
Start with **Phase 1** (`01_BACKEND_API.md`) to build the backend foundation, then proceed sequentially through each phase.
