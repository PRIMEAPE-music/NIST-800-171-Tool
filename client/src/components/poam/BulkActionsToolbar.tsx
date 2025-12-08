import React from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import {
  PictureAsPdf,
  TableChart,
  Edit,
  Delete,
  Clear,
} from '@mui/icons-material';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onBulkStatusUpdate: () => void;
  onBulkDelete: () => void;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  onClearSelection,
  onExportPdf,
  onExportExcel,
  onExportCsv,
  onBulkStatusUpdate,
  onBulkDelete,
}) => {
  if (selectedCount === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        mb: 2,
        bgcolor: '#1E1E1E',
        borderRadius: 1,
        borderLeft: '4px solid #90CAF9',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Chip
          label={`${selectedCount} POAM${selectedCount > 1 ? 's' : ''} selected`}
          color="primary"
          size="medium"
          sx={{ fontWeight: 600 }}
        />
        <Button
          startIcon={<PictureAsPdf />}
          onClick={onExportPdf}
          variant="outlined"
          size="small"
        >
          Export PDF
        </Button>
        <Button
          startIcon={<TableChart />}
          onClick={onExportExcel}
          variant="outlined"
          size="small"
        >
          Export Excel
        </Button>
        <Button
          startIcon={<TableChart />}
          onClick={onExportCsv}
          variant="outlined"
          size="small"
        >
          Export CSV
        </Button>
        <Button
          startIcon={<Edit />}
          onClick={onBulkStatusUpdate}
          variant="outlined"
          size="small"
        >
          Update Status
        </Button>
        <Button
          startIcon={<Delete />}
          onClick={onBulkDelete}
          variant="outlined"
          color="error"
          size="small"
        >
          Delete
        </Button>
      </Box>
      <Button
        startIcon={<Clear />}
        onClick={onClearSelection}
        size="small"
        sx={{ minWidth: 'auto' }}
      >
        Clear Selection
      </Button>
    </Box>
  );
};
