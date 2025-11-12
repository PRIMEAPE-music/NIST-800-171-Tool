# Policy Viewer Testing Checklist

## Backend Testing

### API Endpoints
- [ ] GET /api/m365/policies/viewer returns all policies
- [ ] GET /api/m365/policies/viewer?policyType=Intune filters correctly
- [ ] GET /api/m365/policies/viewer?searchTerm=test searches correctly
- [ ] GET /api/m365/policies/viewer?isActive=true filters correctly
- [ ] GET /api/m365/policies/viewer/:id returns single policy
- [ ] GET /api/m365/policies/viewer/stats returns correct counts
- [ ] GET /api/m365/policies/viewer/export returns valid data

### Data Parsing
- [ ] Intune policies parsed correctly
- [ ] Purview policies parsed correctly
- [ ] Azure AD policies parsed correctly
- [ ] Invalid JSON handled gracefully
- [ ] Missing fields don't cause errors

## Frontend Testing

### Page Load
- [ ] Policy Viewer page loads without errors
- [ ] Stats cards display correct numbers
- [ ] Tabs show correct badge counts
- [ ] Loading skeletons display during data fetch
- [ ] Empty state shows when no policies

### Search & Filter
- [ ] Search bar filters policies by name
- [ ] Search bar filters policies by description
- [ ] Active/Inactive toggle filters correctly
- [ ] Policy type tabs filter correctly
- [ ] Sort by name works (asc/desc)
- [ ] Sort by last synced works
- [ ] Sort by type works
- [ ] Filters combine correctly

### Policy Cards
- [ ] Intune cards display correctly
- [ ] Purview cards display correctly
- [ ] Azure AD cards display correctly
- [ ] Expand/collapse functionality works
- [ ] Policy settings display in expanded view
- [ ] Mapped controls show with correct badges
- [ ] Active/inactive status shows correctly
- [ ] Last synced date formats correctly

### Policy Detail Modal
- [ ] Modal opens when clicking info icon
- [ ] Modal displays all policy information
- [ ] Modal shows mapped controls
- [ ] Modal displays JSON data properly
- [ ] Modal closes correctly

### Sync Functionality
- [ ] Sync button triggers sync
- [ ] Sync status indicator shows correct state
- [ ] Sync success shows notification
- [ ] Sync error shows error message
- [ ] Policies refresh after sync

### Export Functionality
- [ ] Export button downloads JSON file
- [ ] Exported data contains all policies
- [ ] Exported data includes stats
- [ ] File name includes timestamp

### Keyboard Shortcuts
- [ ] Ctrl/⌘ + K focuses search
- [ ] Ctrl/⌘ + R triggers sync
- [ ] Ctrl/⌘ + E triggers export

### Responsive Design
- [ ] Layout works on mobile (< 600px)
- [ ] Layout works on tablet (600-960px)
- [ ] Layout works on desktop (> 960px)
- [ ] Cards stack properly on mobile
- [ ] Search bar stacks on mobile
- [ ] Stats cards stack on mobile

### Error Handling
- [ ] Network errors show user-friendly message
- [ ] Invalid policy data doesn't crash app
- [ ] Missing fields display gracefully
- [ ] Error boundary catches component errors

## Integration Testing

### M365 Sync Integration
- [ ] Syncing policies updates viewer
- [ ] New policies appear after sync
- [ ] Updated policies reflect changes
- [ ] Deleted policies removed from view

### Navigation
- [ ] Can navigate to Policy Viewer from sidebar
- [ ] Can navigate back from Policy Viewer
- [ ] Browser back/forward works correctly

## Performance Testing

- [ ] Page loads in < 2 seconds with 50 policies
- [ ] Search is responsive (< 100ms)
- [ ] Filtering is responsive (< 100ms)
- [ ] Scrolling is smooth with many policies
- [ ] Modal opens quickly

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Accessibility

- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Labels present for form controls

## Edge Cases

- [ ] Zero policies synced
- [ ] Single policy
- [ ] 100+ policies
- [ ] Very long policy names
- [ ] Very long policy descriptions
- [ ] Policy with no mapped controls
- [ ] Policy with many mapped controls (10+)
- [ ] Never synced state
- [ ] Stale sync (> 7 days old)
