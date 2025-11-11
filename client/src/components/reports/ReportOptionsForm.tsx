import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Paper,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import { ReportFilters, ReportFormat } from '../../types/reports';

interface ReportOptionsFormProps {
  availableFormats: ReportFormat[];
  selectedFormat: ReportFormat;
  onFormatChange: (format: ReportFormat) => void;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  customTitle: string;
  onCustomTitleChange: (title: string) => void;
  reportType: string;
}

const CONTROL_FAMILIES = [
  'AC',
  'AT',
  'AU',
  'CA',
  'CM',
  'CP',
  'IA',
  'IR',
  'MA',
  'MP',
  'PE',
  'PS',
  'RA',
  'SC',
  'SI',
];

const STATUSES = ['Not Started', 'In Progress', 'Implemented', 'Verified'];

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const POAM_STATUSES = ['Open', 'In Progress', 'Completed', 'Risk Accepted'];

export const ReportOptionsForm: React.FC<ReportOptionsFormProps> = ({
  availableFormats,
  selectedFormat,
  onFormatChange,
  filters,
  onFiltersChange,
  customTitle,
  onCustomTitleChange,
  reportType,
}) => {
  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleMultiSelectChange = (
    key: keyof ReportFilters,
    event: SelectChangeEvent<string[]>
  ) => {
    const value = event.target.value;
    onFiltersChange({
      ...filters,
      [key]: typeof value === 'string' ? value.split(',') : value,
    });
  };

  return (
    <Paper sx={{ p: 3, bgcolor: 'background.paper' }}>
      <Typography variant="h6" gutterBottom>
        Report Options
      </Typography>

      {/* Format Selection */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Format</InputLabel>
        <Select
          value={selectedFormat}
          label="Format"
          onChange={(e) => onFormatChange(e.target.value as ReportFormat)}
        >
          {availableFormats.map((format) => (
            <MenuItem key={format} value={format}>
              {format.toUpperCase()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Custom Title */}
      <TextField
        fullWidth
        label="Custom Title (Optional)"
        value={customTitle}
        onChange={(e) => onCustomTitleChange(e.target.value)}
        sx={{ mb: 2 }}
        placeholder="Leave blank for default title"
      />

      {/* Filters Section */}
      <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
        Filters
      </Typography>

      {/* Date Range */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          type="date"
          label="Date From"
          value={filters.dateFrom || ''}
          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <TextField
          type="date"
          label="Date To"
          value={filters.dateTo || ''}
          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
      </Box>

      {/* Control Families */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Control Families</InputLabel>
        <Select
          multiple
          value={filters.families || []}
          label="Control Families"
          onChange={(e) => handleMultiSelectChange('families', e)}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
        >
          {CONTROL_FAMILIES.map((family) => (
            <MenuItem key={family} value={family}>
              {family}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Statuses (except for POAM report) */}
      {reportType !== 'poam' && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Statuses</InputLabel>
          <Select
            multiple
            value={filters.statuses || []}
            label="Statuses"
            onChange={(e) => handleMultiSelectChange('statuses', e)}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* POAM Statuses (only for POAM report) */}
      {reportType === 'poam' && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>POAM Statuses</InputLabel>
          <Select
            multiple
            value={filters.poamStatuses || []}
            label="POAM Statuses"
            onChange={(e) => handleMultiSelectChange('poamStatuses', e)}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {POAM_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Priorities */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Priorities</InputLabel>
        <Select
          multiple
          value={filters.priorities || []}
          label="Priorities"
          onChange={(e) => handleMultiSelectChange('priorities', e)}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
        >
          {PRIORITIES.map((priority) => (
            <MenuItem key={priority} value={priority}>
              {priority}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Risk Score Range (for Gap Analysis) */}
      {reportType === 'gap-analysis' && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            type="number"
            label="Min Risk Score"
            value={filters.riskScoreMin || ''}
            onChange={(e) =>
              handleFilterChange('riskScoreMin', parseInt(e.target.value) || undefined)
            }
            inputProps={{ min: 0, max: 10 }}
            fullWidth
          />
          <TextField
            type="number"
            label="Max Risk Score"
            value={filters.riskScoreMax || ''}
            onChange={(e) =>
              handleFilterChange('riskScoreMax', parseInt(e.target.value) || undefined)
            }
            inputProps={{ min: 0, max: 10 }}
            fullWidth
          />
        </Box>
      )}

      {/* Evidence Filter */}
      {(reportType === 'detailed-compliance' || reportType === 'gap-analysis') && (
        <FormGroup sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.hasEvidence === true}
                onChange={(e) =>
                  handleFilterChange(
                    'hasEvidence',
                    e.target.checked ? true : undefined
                  )
                }
              />
            }
            label="Has Evidence Only"
          />
        </FormGroup>
      )}

      {/* Overdue Only (for POAM) */}
      {reportType === 'poam' && (
        <FormGroup sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={filters.overdueOnly || false}
                onChange={(e) =>
                  handleFilterChange('overdueOnly', e.target.checked)
                }
              />
            }
            label="Overdue POAMs Only"
          />
        </FormGroup>
      )}

      {/* Clear Filters Button */}
      <Button
        variant="outlined"
        onClick={() => onFiltersChange({})}
        fullWidth
        sx={{ mt: 2 }}
      >
        Clear All Filters
      </Button>
    </Paper>
  );
};
