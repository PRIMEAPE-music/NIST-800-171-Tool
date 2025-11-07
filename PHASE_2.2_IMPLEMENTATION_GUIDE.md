# Phase 2.2 Implementation Guide - Control Library UI

## Status: 80% Complete ✅

## What's Been Implemented

### ✅ Completed Components

1. **Enhanced Control Service** - [client/src/services/controlService.ts](client/src/services/controlService.ts)
   - Full pagination support
   - Bulk operations
   - All Phase 2.1 API methods

2. **TypeScript Enums** - [client/src/types/enums.ts](client/src/types/enums.ts)
   - ControlStatus, ControlPriority, ControlFamily
   - FAMILY_LABELS with control counts
   - Helper functions

3. **StatusBadge Component** - [client/src/components/controls/StatusBadge.tsx](client/src/components/controls/StatusBadge.tsx)
   - Color-coded status chips
   - Dark theme compatible

4. **Common UI Components**
   - [LoadingSpinner.tsx](client/src/components/common/LoadingSpinner.tsx)
   - [ErrorMessage.tsx](client/src/components/common/ErrorMessage.tsx)

5. **ControlFilters Component** - [client/src/components/controls/ControlFilters.tsx](client/src/components/controls/ControlFilters.tsx)
   - Multi-select filters for families, statuses, priorities
   - Search functionality
   - Active filter count
   - Clear all button
   - Dark theme styling

6. **BulkActionsDialog Component** - [client/src/components/controls/BulkActionsDialog.tsx](client/src/components/controls/BulkActionsDialog.tsx)
   - Bulk status updates
   - Bulk assignments
   - React Query integration
   - Error handling

### 🔄 Needs Enhancement

1. **ControlLibrary Page** - Currently has basic implementation, needs Phase 2.2 features:
   - Drawer for mobile filters
   - Pagination controls
   - Sorting functionality
   - Row selection
   - Integration with new components

2. **ControlTable Component** - Needs to be created with:
   - Sorting on columns
   - Row selection (single and all)
   - Click navigation to detail page
   - Bulk actions toolbar

## Next Steps to Complete Phase 2.2

### Step 1: Create ControlTable Component

Create **`client/src/components/controls/ControlTable.tsx`**:

```typescript
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  Toolbar,
  Typography,
  Button,
  Tooltip,
} from '@mui/material';
import {
  ArrowUpward,
  ArrowDownward,
  MoreVert,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import BulkActionsDialog from './BulkActionsDialog';
import { Control } from '@/services/controlService';

interface ControlTableProps {
  controls: Control[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (column: string) => void;
  selectedControls: number[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: number, checked: boolean) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

export const ControlTable: React.FC<ControlTableProps> = ({
  controls,
  sortBy,
  sortOrder,
  onSortChange,
  selectedControls,
  onSelectAll,
  onSelectOne,
  page,
  totalPages,
  onPageChange,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const allSelected = controls.length > 0 && selectedControls.length === controls.length;
  const someSelected = selectedControls.length > 0 && selectedControls.length < controls.length;

  const handleRowClick = (controlId: number) => {
    navigate(`/controls/${controlId}`);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
  };

  return (
    <Paper sx={{ backgroundColor: '#242424' }}>
      {/* Toolbar with bulk actions */}
      {selectedControls.length > 0 && (
        <Toolbar sx={{ bgcolor: 'rgba(144, 202, 249, 0.1)' }}>
          <Typography variant="subtitle1" sx={{ flex: 1, color: '#E0E0E0' }}>
            {selectedControls.length} selected
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() => setBulkDialogOpen(true)}
          >
            Bulk Actions
          </Button>
        </Toolbar>
      )}

      {/* Table */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#2C2C2C' }}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  sx={{
                    color: '#B0B0B0',
                    '&.Mui-checked': { color: '#90CAF9' },
                  }}
                />
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={() => onSortChange('controlId')}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Control ID
                  <SortIcon column="controlId" />
                </Box>
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={() => onSortChange('family')}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Family
                  <SortIcon column="family" />
                </Box>
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>Title</TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 'bold', cursor: 'pointer' }}
                        onClick={() => onSortChange('priority')}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Priority
                  <SortIcon column="priority" />
                </Box>
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>Assigned To</TableCell>
              <TableCell align="center" sx={{ color: '#E0E0E0', fontWeight: 'bold' }}>Evidence</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {controls.map((control) => (
              <TableRow
                key={control.id}
                hover
                selected={selectedControls.includes(control.id)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#2C2C2C' },
                  '&.Mui-selected': { backgroundColor: 'rgba(144, 202, 249, 0.08)' },
                }}
              >
                <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedControls.includes(control.id)}
                    onChange={(e) => onSelectOne(control.id, e.target.checked)}
                    sx={{
                      color: '#B0B0B0',
                      '&.Mui-checked': { color: '#90CAF9' },
                    }}
                  />
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography variant="body2" fontWeight="medium" sx={{ color: '#90CAF9', fontFamily: 'monospace' }}>
                    {control.controlId}
                  </Typography>
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography variant="body2" sx={{ color: '#B0B0B0' }}>{control.family}</Typography>
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 300, color: '#E0E0E0' }}>
                    {control.title}
                  </Typography>
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography
                    variant="body2"
                    color={
                      control.priority === 'Critical' ? '#EF5350' :
                      control.priority === 'High' ? '#FFA726' :
                      '#B0B0B0'
                    }
                  >
                    {control.priority}
                  </Typography>
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <StatusBadge status={control.status?.status || 'Not Started'} />
                </TableCell>
                <TableCell onClick={() => handleRowClick(control.id)}>
                  <Typography variant="body2" color="text.secondary">
                    {control.status?.assignedTo || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="center" onClick={() => handleRowClick(control.id)}>
                  <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
                    {control.evidence?.length || 0}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(control.id);
                  }}>
                    <MoreVert fontSize="small" sx={{ color: '#B0B0B0' }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Button
          startIcon={<Refresh />}
          onClick={onRefresh}
          size="small"
          sx={{ color: '#B0B0B0' }}
        >
          Refresh
        </Button>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            size="small"
          >
            Previous
          </Button>
          <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
            Page {page} of {totalPages}
          </Typography>
          <Button
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            size="small"
          >
            Next
          </Button>
        </Box>
      </Box>

      {/* Bulk Actions Dialog */}
      <BulkActionsDialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        selectedControlIds={selectedControls}
        onSuccess={() => {
          setBulkDialogOpen(false);
          onRefresh();
        }}
      />
    </Paper>
  );
};

export default ControlTable;
```

### Step 2: Update ControlLibrary Page

Update **`client/src/pages/ControlLibrary.tsx`** with the following key changes:

1. Import new components:
```typescript
import { ControlFilters } from '@/components/controls/ControlFilters';
import { ControlTable } from '@/components/controls/ControlTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { FilterList as FilterIcon, Close as CloseIcon } from '@mui/icons-material';
import { Drawer, Fab } from '@mui/material';
```

2. Add state for full Phase 2.2 features:
```typescript
const [filters, setFilters] = useState({
  families: [] as string[],
  statuses: [] as string[],
  priorities: [] as string[],
  search: ''
});
const [sortBy, setSortBy] = useState<string>('controlId');
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
const [page, setPage] = useState<number>(1);
const [filterDrawerOpen, setFilterDrawerOpen] = useState<boolean>(false);
const [selectedControls, setSelectedControls] = useState<number[]>([]);
```

3. Update the API call to use pagination:
```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['controls', filters, sortBy, sortOrder, page],
  queryFn: () => controlService.getAllControls({
    family: filters.families.join(','),
    status: filters.statuses.join(','),
    priority: filters.priorities.join(','),
    search: filters.search,
    sortBy,
    sortOrder,
    page,
    limit: 50
  })
});
```

4. Add handler functions (see complete example in Phase 2.2 spec)

5. Replace the table with ControlTable component

### Step 3: Test the Implementation

```bash
# Start the backend
cd server
npm run dev

# In another terminal, start the frontend
cd client
npm run dev
```

Test checklist:
- [ ] Filters work (family, status, priority)
- [ ] Search functionality works
- [ ] Sorting works on all columns
- [ ] Pagination works
- [ ] Row selection works
- [ ] Bulk actions dialog opens
- [ ] Bulk update executes successfully
- [ ] Mobile drawer works
- [ ] Dark theme looks good
- [ ] Navigation to detail page works

## Files Created/Modified

### Created
- `client/src/types/enums.ts`
- `client/src/components/controls/StatusBadge.tsx`
- `client/src/components/controls/ControlFilters.tsx`
- `client/src/components/controls/BulkActionsDialog.tsx`
- `client/src/components/common/LoadingSpinner.tsx`
- `client/src/components/common/ErrorMessage.tsx`

### Modified
- `client/src/services/controlService.ts` - Added all Phase 2.1 methods

### Needs Creation
- `client/src/components/controls/ControlTable.tsx` - See implementation above

### Needs Update
- `client/src/pages/ControlLibrary.tsx` - Integrate all new components

## Key Features Implemented

✅ Multi-select filters (families, statuses, priorities)
✅ Search functionality
✅ Active filter count display
✅ Clear all filters button
✅ Bulk operations dialog
✅ Status badges with color coding
✅ Dark theme styling throughout
✅ Loading and error states
✅ React Query integration
✅ TypeScript type safety

## Remaining Tasks

1. Create ControlTable component (30 minutes)
2. Update ControlLibrary page to integrate components (30 minutes)
3. Test all functionality (30 minutes)
4. Fix any bugs (variable)

## API Integration

All components are ready to work with the Phase 2.1 backend API:
- GET /api/controls (with pagination, filtering, sorting)
- POST /api/controls/bulk (for bulk operations)
- All responses are properly typed

## Dark Theme

All components follow the project's dark theme guidelines:
- Background: #121212 / #242424
- Text Primary: #E0E0E0
- Text Secondary: #B0B0B0
- Accent: #90CAF9
- Dividers: rgba(255, 255, 255, 0.08)

## Next Phase

After completing Phase 2.2:
- Move to **Phase 2.3 - Control Detail Page**
- Or continue with **Phase 2.4 - Dashboard & Statistics**

---

**Phase 2.2 Status:** 80% Complete - Missing ControlTable component creation and final integration

**Estimated Time to Complete:** 1-2 hours
