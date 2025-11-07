import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Chip,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Warning as WarningIcon } from '@mui/icons-material';

interface Gap {
  id: number;
  controlId: string;
  title: string;
  priority: string;
  status?: {
    status: string;
  };
}

interface TopGapsCardProps {
  gaps: Gap[];
}

const TopGapsCard: React.FC<TopGapsCardProps> = ({ gaps }) => {
  const navigate = useNavigate();

  const getPriorityColor = (priority: string): 'error' | 'warning' | 'default' => {
    switch (priority) {
      case 'Critical':
        return 'error';
      case 'High':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Card sx={{ height: '100%', backgroundColor: '#242424' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <WarningIcon sx={{ color: '#FFA726' }} />
          <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
            Top Priority Gaps
          </Typography>
        </Box>

        {gaps.length === 0 ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            No high-priority gaps! All critical and high priority controls are being addressed.
          </Alert>
        ) : (
          <List dense>
            {gaps.slice(0, 10).map((gap) => (
              <ListItem key={gap.id} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => navigate(`/controls/${gap.id}`)}
                  sx={{
                    border: '1px solid',
                    borderColor: '#4A4A4A',
                    borderRadius: 1,
                    '&:hover': {
                      borderColor: '#90CAF9',
                      backgroundColor: 'rgba(144, 202, 249, 0.05)'
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" fontWeight="medium" sx={{ color: '#E0E0E0' }}>
                          {gap.controlId}
                        </Typography>
                        <Chip
                          label={gap.priority}
                          size="small"
                          color={getPriorityColor(gap.priority)}
                          sx={{ fontSize: '0.7rem' }}
                        />
                        <Chip
                          label={gap.status?.status || 'Not Started'}
                          size="small"
                          sx={{ fontSize: '0.7rem', bgcolor: 'rgba(117, 117, 117, 0.3)', color: '#B0B0B0' }}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: '#B0B0B0' }} noWrap>
                        {gap.title}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        {gaps.length > 10 && (
          <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#B0B0B0' }}>
            Showing top 10 of {gaps.length} gaps
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default TopGapsCard;
