import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box
} from '@mui/material';
import {
  ListAlt,
  Assessment,
  Description,
  CloudSync,
  Refresh
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  onRefresh: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onRefresh }) => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'View All Controls',
      icon: <ListAlt />,
      onClick: () => navigate('/controls'),
      color: 'primary' as const,
      disabled: false,
      tooltip: ''
    },
    {
      label: 'Start Assessment',
      icon: <Assessment />,
      onClick: () => {}, // Will be implemented in Phase 3
      color: 'secondary' as const,
      disabled: true,
      tooltip: 'Available in Phase 3'
    },
    {
      label: 'Generate Report',
      icon: <Description />,
      onClick: () => {}, // Will be implemented in Phase 7
      color: 'info' as const,
      disabled: true,
      tooltip: 'Available in Phase 7'
    },
    {
      label: 'Sync M365',
      icon: <CloudSync />,
      onClick: () => {}, // Will be implemented in Phase 6
      color: 'success' as const,
      disabled: true,
      tooltip: 'Available in Phase 6'
    }
  ];

  return (
    <Card sx={{ backgroundColor: '#242424' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#E0E0E0' }}>
            Quick Actions
          </Typography>
          <Button
            startIcon={<Refresh />}
            onClick={onRefresh}
            size="small"
            sx={{ color: '#90CAF9' }}
          >
            Refresh Data
          </Button>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          {actions.map((action) => (
            <Button
              key={action.label}
              fullWidth
              variant="outlined"
              startIcon={action.icon}
              onClick={action.onClick}
              disabled={action.disabled}
              sx={{
                py: 1.5,
                borderColor: '#4A4A4A',
                color: action.disabled ? '#757575' : '#90CAF9',
                '&:hover': {
                  borderColor: '#90CAF9',
                  backgroundColor: 'rgba(144, 202, 249, 0.05)'
                }
              }}
            >
              {action.label}
            </Button>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
