import React from 'react';
import {
  Box,
  Typography,
  Paper,
} from '@mui/material';
import {
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface ChangeHistoryItem {
  id: number;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
  changedAt: string;
}

interface HistoryTabProps {
  history: ChangeHistoryItem[];
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ history }) => {
  const getIconForChange = (fieldName: string) => {
    switch (fieldName) {
      case 'status':
        return <CheckIcon fontSize="small" />;
      case 'implementationNotes':
        return <EditIcon fontSize="small" />;
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  const getColorForChange = (fieldName: string): 'success' | 'info' | 'grey' => {
    switch (fieldName) {
      case 'status':
        return 'success';
      case 'implementationNotes':
        return 'info';
      default:
        return 'grey';
    }
  };

  const formatFieldName = (fieldName: string): string => {
    const names: Record<string, string> = {
      status: 'Status',
      implementationNotes: 'Implementation Notes',
      assignedTo: 'Assigned To',
      nextReviewDate: 'Next Review Date',
      implementationDate: 'Implementation Date',
    };
    return names[fieldName] || fieldName;
  };

  if (!history || history.length === 0) {
    return (
      <Box sx={{ px: 3, py: 8, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ color: '#B0B0B0' }}>
          No change history yet
        </Typography>
        <Typography variant="body2" sx={{ color: '#757575', mt: 1 }}>
          Changes to this control will appear here
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
        Change History
      </Typography>
      <Box sx={{ position: 'relative', pl: 4 }}>
        {/* Custom timeline line */}
        <Box
          sx={{
            position: 'absolute',
            left: 16,
            top: 24,
            bottom: 24,
            width: 2,
            bgcolor: '#4A4A4A',
          }}
        />

        {history.map((change) => (
          <Box key={change.id} sx={{ position: 'relative', mb: 3 }}>
            {/* Timeline dot */}
            <Box
              sx={{
                position: 'absolute',
                left: -28,
                top: 8,
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: getColorForChange(change.fieldChanged) === 'success' ? '#66BB6A' :
                         getColorForChange(change.fieldChanged) === 'info' ? '#42A5F5' : '#757575',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              {getIconForChange(change.fieldChanged)}
            </Box>

            {/* Date/Time */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                {new Date(change.changedAt).toLocaleDateString()} at{' '}
                {new Date(change.changedAt).toLocaleTimeString()}
              </Typography>
            </Box>

            {/* Change content */}
            <Paper
              elevation={0}
              variant="outlined"
              sx={{
                p: 2,
                backgroundColor: '#242424',
                borderColor: '#4A4A4A',
              }}
            >
              <Typography variant="subtitle2" gutterBottom sx={{ color: '#E0E0E0' }}>
                {formatFieldName(change.fieldChanged)} Updated
              </Typography>

              {change.oldValue && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                    From:
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 1, color: '#757575' }}>
                    {change.oldValue}
                  </Typography>
                </Box>
              )}

              {change.newValue && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                    To:
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 1, color: '#E0E0E0' }}>
                    {change.newValue}
                  </Typography>
                </Box>
              )}

              {change.changedBy && (
                <Typography
                  variant="caption"
                  sx={{ mt: 1, display: 'block', color: '#B0B0B0' }}
                >
                  By: {change.changedBy}
                </Typography>
              )}
            </Paper>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default HistoryTab;
