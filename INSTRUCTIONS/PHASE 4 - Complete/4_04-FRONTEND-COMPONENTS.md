# Phase 4 Part 3: Frontend Components - POAM UI

## Objective
Build React components for POAM management with Material-UI, TypeScript, and dark theme styling.

## Component Architecture
```
pages/
  POAMManager.tsx          # Main page container
components/
  poam/
    POAMList.tsx           # Table view of all POAMs
    POAMDetailDialog.tsx   # Full POAM details modal
    POAMForm.tsx           # Create/Edit form
    MilestoneTracker.tsx   # Visual milestone progress
    POAMStatusChip.tsx     # Status badge component
    POAMFilters.tsx        # Filter controls
```

---

## Step 1: API Service Layer

📁 `/client/src/services/poam.api.ts`

🔄 **CREATE NEW FILE:**

```typescript
import axios from 'axios';
import {
  Poam,
  PoamWithControl,
  CreatePoamDto,
  UpdatePoamDto,
  PoamMilestone,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  PoamStats,
  PoamFilters,
} from '../types/poam.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const poamApi = {
  // POAM operations
  getAllPoams: async (filters?: PoamFilters): Promise<PoamWithControl[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.controlId) params.append('controlId', filters.controlId.toString());
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.overdue) params.append('overdue', 'true');

    const response = await axios.get(`${API_BASE}/poams?${params}`);
    return response.data;
  },

  getPoamById: async (id: number): Promise<PoamWithControl> => {
    const response = await axios.get(`${API_BASE}/poams/${id}`);
    return response.data;
  },

  createPoam: async (data: CreatePoamDto): Promise<Poam> => {
    const response = await axios.post(`${API_BASE}/poams`, data);
    return response.data;
  },

  updatePoam: async (id: number, data: UpdatePoamDto): Promise<Poam> => {
    const response = await axios.put(`${API_BASE}/poams/${id}`, data);
    return response.data;
  },

  updatePoamStatus: async (id: number, status: string): Promise<Poam> => {
    const response = await axios.patch(`${API_BASE}/poams/${id}/status`, {
      status,
    });
    return response.data;
  },

  deletePoam: async (id: number): Promise<void> => {
    await axios.delete(`${API_BASE}/poams/${id}`);
  },

  getPoamStats: async (): Promise<PoamStats> => {
    const response = await axios.get(`${API_BASE}/poams/stats`);
    return response.data;
  },

  // Milestone operations
  addMilestone: async (
    poamId: number,
    data: CreateMilestoneDto
  ): Promise<PoamMilestone> => {
    const response = await axios.post(
      `${API_BASE}/poams/${poamId}/milestones`,
      data
    );
    return response.data;
  },

  updateMilestone: async (
    poamId: number,
    milestoneId: number,
    data: UpdateMilestoneDto
  ): Promise<PoamMilestone> => {
    const response = await axios.put(
      `${API_BASE}/poams/${poamId}/milestones/${milestoneId}`,
      data
    );
    return response.data;
  },

  completeMilestone: async (
    poamId: number,
    milestoneId: number
  ): Promise<PoamMilestone> => {
    const response = await axios.patch(
      `${API_BASE}/poams/${poamId}/milestones/${milestoneId}/complete`
    );
    return response.data;
  },

  deleteMilestone: async (poamId: number, milestoneId: number): Promise<void> => {
    await axios.delete(`${API_BASE}/poams/${poamId}/milestones/${milestoneId}`);
  },
};
```

---

## Step 2: TypeScript Types

📁 `/client/src/types/poam.types.ts`

🔄 **CREATE NEW FILE:**

```typescript
export interface Poam {
  id: number;
  controlId: number;
  gapDescription: string;
  remediationPlan: string;
  assignedTo: string | null;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted';
  startDate: string | null;
  targetCompletionDate: string | null;
  actualCompletionDate: string | null;
  resourcesRequired: string | null;
  budgetEstimate: number | null;
  riskAcceptanceNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PoamMilestone {
  id: number;
  poamId: number;
  milestoneDescription: string;
  dueDate: string;
  completionDate: string | null;
  status: 'Pending' | 'In Progress' | 'Completed';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PoamWithControl extends Poam {
  control: {
    id: number;
    controlId: string;
    title: string;
    family: string;
    requirementText?: string;
  };
  milestones: PoamMilestone[];
}

export interface CreatePoamDto {
  controlId: number;
  gapDescription: string;
  remediationPlan: string;
  assignedTo?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status?: 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted';
  startDate?: string;
  targetCompletionDate?: string;
  resourcesRequired?: string;
  budgetEstimate?: number;
}

export interface UpdatePoamDto {
  gapDescription?: string;
  remediationPlan?: string;
  assignedTo?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status?: 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted';
  startDate?: string;
  targetCompletionDate?: string;
  actualCompletionDate?: string;
  resourcesRequired?: string;
  budgetEstimate?: number;
  riskAcceptanceNotes?: string;
}

export interface CreateMilestoneDto {
  milestoneDescription: string;
  dueDate: string;
  status?: 'Pending' | 'In Progress' | 'Completed';
  notes?: string;
}

export interface UpdateMilestoneDto {
  milestoneDescription?: string;
  dueDate?: string;
  completionDate?: string;
  status?: 'Pending' | 'In Progress' | 'Completed';
  notes?: string;
}

export interface PoamFilters {
  status?: 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted';
  priority?: 'High' | 'Medium' | 'Low';
  controlId?: number;
  assignedTo?: string;
  overdue?: boolean;
}

export interface PoamStats {
  total: number;
  byStatus: {
    Open: number;
    'In Progress': number;
    Completed: number;
    'Risk Accepted': number;
  };
  byPriority: {
    High: number;
    Medium: number;
    Low: number;
  };
  overdue: number;
  completedThisMonth: number;
}
```

---

## Step 3: Status Chip Component

📁 `/client/src/components/poam/POAMStatusChip.tsx`

🔄 **CREATE NEW FILE:**

```typescript
import React from 'react';
import { Chip } from '@mui/material';

interface POAMStatusChipProps {
  status: 'Open' | 'In Progress' | 'Completed' | 'Risk Accepted';
  size?: 'small' | 'medium';
}

const statusColors = {
  Open: '#757575',
  'In Progress': '#FFA726',
  Completed: '#66BB6A',
  'Risk Accepted': '#42A5F5',
};

export const POAMStatusChip: React.FC<POAMStatusChipProps> = ({
  status,
  size = 'small',
}) => {
  return (
    <Chip
      label={status}
      size={size}
      sx={{
        backgroundColor: statusColors[status],
        color: '#FFFFFF',
        fontWeight: 500,
      }}
    />
  );
};
```

---

## Step 4: Priority Chip Component

📁 `/client/src/components/poam/POAMPriorityChip.tsx`

🔄 **CREATE NEW FILE:**

```typescript
import React from 'react';
import { Chip } from '@mui/material';

interface POAMPriorityChipProps {
  priority: 'High' | 'Medium' | 'Low';
  size?: 'small' | 'medium';
}

const priorityColors = {
  High: '#F44336',
  Medium: '#FF9800',
  Low: '#4CAF50',
};

export const POAMPriorityChip: React.FC<POAMPriorityChipProps> = ({
  priority,
  size = 'small',
}) => {
  return (
    <Chip
      label={priority}
      size={size}
      sx={{
        backgroundColor: priorityColors[priority],
        color: '#FFFFFF',
        fontWeight: 500,
      }}
    />
  );
};
```

---

## Step 5: POAM Filters Component

📁 `/client/src/components/poam/POAMFilters.tsx`

🔄 **CREATE NEW FILE:**

```typescript
import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
} from '@mui/material';
import { FilterList, Clear } from '@mui/icons-material';
import { PoamFilters } from '../../types/poam.types';

interface POAMFiltersProps {
  filters: PoamFilters;
  onFiltersChange: (filters: PoamFilters) => void;
  onClearFilters: () => void;
}

export const POAMFilters: React.FC<POAMFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const handleChange = (field: keyof PoamFilters, value: any) => {
    onFiltersChange({ ...filters, [field]: value || undefined });
  };

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== ''
  );

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        alignItems: 'center',
        mb: 3,
        p: 2,
        bgcolor: '#1E1E1E',
        borderRadius: 1,
      }}
    >
      <FilterList sx={{ color: '#B0B0B0' }} />

      <FormControl sx={{ minWidth: 150 }} size="small">
        <InputLabel>Status</InputLabel>
        <Select
          value={filters.status || ''}
          label="Status"
          onChange={(e) => handleChange('status', e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Open">Open</MenuItem>
          <MenuItem value="In Progress">In Progress</MenuItem>
          <MenuItem value="Completed">Completed</MenuItem>
          <MenuItem value="Risk Accepted">Risk Accepted</MenuItem>
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 150 }} size="small">
        <InputLabel>Priority</InputLabel>
        <Select
          value={filters.priority || ''}
          label="Priority"
          onChange={(e) => handleChange('priority', e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="High">High</MenuItem>
          <MenuItem value="Medium">Medium</MenuItem>
          <MenuItem value="Low">Low</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Assigned To"
        size="small"
        value={filters.assignedTo || ''}
        onChange={(e) => handleChange('assignedTo', e.target.value)}
        sx={{ minWidth: 200 }}
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={filters.overdue || false}
            onChange={(e) => handleChange('overdue', e.target.checked)}
          />
        }
        label="Overdue Only"
      />

      {hasActiveFilters && (
        <Button
          startIcon={<Clear />}
          onClick={onClearFilters}
          variant="outlined"
          size="small"
        >
          Clear Filters
        </Button>
      )}
    </Box>
  );
};
```

---

## Step 6: POAM List Component

📁 `/client/src/components/poam/POAMList.tsx`

🔄 **CREATE NEW FILE:**

```typescript
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Box,
  Typography,
  TablePagination,
} from '@mui/material';
import { Edit, Delete, Visibility, Warning } from '@mui/icons-material';
import { POAMStatusChip } from './POAMStatusChip';
import { POAMPriorityChip } from './POAMPriorityChip';
import { PoamWithControl } from '../../types/poam.types';
import { format, isPast } from 'date-fns';

interface POAMListProps {
  poams: PoamWithControl[];
  onView: (poam: PoamWithControl) => void;
  onEdit: (poam: PoamWithControl) => void;
  onDelete: (poam: PoamWithControl) => void;
}

export const POAMList: React.FC<POAMListProps> = ({
  poams,
  onView,
  onEdit,
  onDelete,
}) => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const isOverdue = (poam: PoamWithControl) => {
    return (
      poam.targetCompletionDate &&
      isPast(new Date(poam.targetCompletionDate)) &&
      poam.status !== 'Completed'
    );
  };

  const paginatedPoams = poams.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Paper sx={{ bgcolor: '#242424' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#1E1E1E' }}>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Control
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Gap Description
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Priority
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Status
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Assigned To
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Target Date
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Progress
              </TableCell>
              <TableCell sx={{ color: '#E0E0E0', fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedPoams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No POAMs found. Create one to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedPoams.map((poam) => {
                const completedMilestones = poam.milestones.filter(
                  (m) => m.status === 'Completed'
                ).length;
                const totalMilestones = poam.milestones.length;
                const progress =
                  totalMilestones > 0
                    ? Math.round((completedMilestones / totalMilestones) * 100)
                    : 0;

                return (
                  <TableRow
                    key={poam.id}
                    hover
                    sx={{
                      '&:hover': { bgcolor: '#2C2C2C' },
                      bgcolor: isOverdue(poam) ? 'rgba(244, 67, 54, 0.05)' : 'transparent',
                    }}
                  >
                    <TableCell>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ color: '#90CAF9', fontWeight: 500 }}
                        >
                          {poam.control.controlId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {poam.control.family}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={poam.gapDescription} arrow>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 250,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {poam.gapDescription}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <POAMPriorityChip priority={poam.priority} />
                    </TableCell>
                    <TableCell>
                      <POAMStatusChip status={poam.status} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {poam.assignedTo || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {isOverdue(poam) && (
                          <Tooltip title="Overdue">
                            <Warning sx={{ color: '#F44336', fontSize: 18 }} />
                          </Tooltip>
                        )}
                        <Typography variant="body2">
                          {poam.targetCompletionDate
                            ? format(
                                new Date(poam.targetCompletionDate),
                                'MMM dd, yyyy'
                              )
                            : '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {progress}% ({completedMilestones}/{totalMilestones})
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => onView(poam)}
                            sx={{ color: '#90CAF9' }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => onEdit(poam)}
                            sx={{ color: '#FFA726' }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => onDelete(poam)}
                            sx={{ color: '#F44336' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={poams.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        sx={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: '#1E1E1E',
        }}
      />
    </Paper>
  );
};
```

---

## Completion for Part 3

This creates the foundation components. The next file will cover:
- POAM Form (create/edit)
- Milestone Tracker
- POAM Detail Dialog
- Main POAMManager page

---

## Next Steps
Proceed to **04-FRONTEND-ADVANCED.md** for the remaining complex components.
