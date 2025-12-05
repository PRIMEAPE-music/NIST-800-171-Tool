import React from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  Typography,
  Chip,
  Divider,
} from '@mui/material';

export interface GapItemData {
  id: number | string;
  name: string;
  description?: string;
  rationale?: string;
  frequency?: string;
  freshnessStatus?: 'missing' | 'fresh' | 'aging' | 'stale' | 'critical';
}

interface GapItemCheckboxListProps {
  items: GapItemData[];
  selectedItems: Set<number | string>;
  onToggleItem: (itemId: number | string) => void;
  onToggleAll: (itemIds: (number | string)[]) => void;
  showSelectAll?: boolean;
  emptyMessage?: string;
}

export const GapItemCheckboxList: React.FC<GapItemCheckboxListProps> = ({
  items,
  selectedItems,
  onToggleItem,
  onToggleAll,
  showSelectAll = true,
  emptyMessage = 'No items',
}) => {
  const allSelected = items.length > 0 && items.every((item) => selectedItems.has(item.id));
  const someSelected = items.some((item) => selectedItems.has(item.id)) && !allSelected;

  const handleSelectAll = () => {
    const itemIds = items.map((item) => item.id);
    onToggleAll(itemIds);
  };

  const getFreshnessStatusColor = (status?: string): string => {
    switch (status) {
      case 'missing':
        return '#f44336'; // Red
      case 'fresh':
        return '#4caf50'; // Green
      case 'aging':
        return '#ff9800'; // Orange
      case 'stale':
        return '#ff5722'; // Orange-Red
      case 'critical':
        return '#d32f2f'; // Dark Red
      default:
        return '#757575'; // Gray
    }
  };

  if (items.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: '#B0B0B0', fontStyle: 'italic', p: 2 }}>
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Box>
      {/* Select All Checkbox */}
      {showSelectAll && (
        <>
          <FormControlLabel
            control={
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={handleSelectAll}
                sx={{
                  color: '#90CAF9',
                  '&.Mui-checked': { color: '#90CAF9' },
                  '&.MuiCheckbox-indeterminate': { color: '#90CAF9' },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#E0E0E0' }}>
                Select All ({items.length})
              </Typography>
            }
          />
          <Divider sx={{ my: 1, borderColor: '#424242' }} />
        </>
      )}

      {/* Individual Items */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {items.map((item, index) => (
          <Box
            key={item.id}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              p: 1.5,
              bgcolor: selectedItems.has(item.id) ? '#2A2A2A' : '#1E1E1E',
              borderRadius: 1,
              border: selectedItems.has(item.id) ? '1px solid #90CAF9' : '1px solid #333',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: '#2A2A2A',
                borderColor: '#555',
              },
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedItems.has(item.id)}
                  onChange={() => onToggleItem(item.id)}
                  sx={{
                    color: '#90CAF9',
                    '&.Mui-checked': { color: '#90CAF9' },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#E0E0E0' }}>
                      {item.name}
                    </Typography>
                    {item.freshnessStatus && (
                      <Chip
                        label={item.freshnessStatus}
                        size="small"
                        sx={{
                          bgcolor: getFreshnessStatusColor(item.freshnessStatus),
                          color: '#fff',
                          height: 20,
                          fontSize: '0.7rem',
                          textTransform: 'capitalize',
                        }}
                      />
                    )}
                    {item.frequency && (
                      <Chip
                        label={`Freq: ${item.frequency}`}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: '#555',
                          color: '#B0B0B0',
                          height: 20,
                          fontSize: '0.7rem',
                        }}
                      />
                    )}
                  </Box>
                  {item.description && (
                    <Typography variant="caption" sx={{ color: '#B0B0B0', fontSize: '0.85rem' }}>
                      {item.description}
                    </Typography>
                  )}
                  {item.rationale && (
                    <Typography
                      variant="caption"
                      sx={{ color: '#B0B0B0', fontSize: '0.75rem', fontStyle: 'italic' }}
                    >
                      <strong>Rationale:</strong> {item.rationale}
                    </Typography>
                  )}
                </Box>
              }
              sx={{ m: 0, alignItems: 'flex-start', width: '100%' }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};
