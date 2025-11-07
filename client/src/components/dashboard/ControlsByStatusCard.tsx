import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  RadioButtonUnchecked,
  PlayCircleOutline,
  CheckCircle,
  Verified
} from '@mui/icons-material';

interface ControlsByStatusCardProps {
  stats?: {
    notStarted: number;
    inProgress: number;
    implemented: number;
    verified: number;
  };
}

const ControlsByStatusCard: React.FC<ControlsByStatusCardProps> = ({ stats }) => {
  if (!stats) return null;

  const statusItems = [
    {
      label: 'Not Started',
      count: stats.notStarted,
      icon: <RadioButtonUnchecked />,
      color: '#757575'
    },
    {
      label: 'In Progress',
      count: stats.inProgress,
      icon: <PlayCircleOutline />,
      color: '#FFA726'
    },
    {
      label: 'Implemented',
      count: stats.implemented,
      icon: <CheckCircle />,
      color: '#66BB6A'
    },
    {
      label: 'Verified',
      count: stats.verified,
      icon: <Verified />,
      color: '#42A5F5'
    }
  ];

  return (
    <Card sx={{ backgroundColor: '#242424', height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
          Controls by Status
        </Typography>

        <List dense>
          {statusItems.map((item) => (
            <ListItem key={item.label} sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Box sx={{ color: item.color }}>
                  {item.icon}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={`${item.count} controls`}
                primaryTypographyProps={{ variant: 'body2', sx: { color: '#E0E0E0' } }}
                secondaryTypographyProps={{ variant: 'caption', sx: { color: '#B0B0B0' } }}
              />
              <Typography variant="h6" sx={{ color: item.color }}>
                {item.count}
              </Typography>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default ControlsByStatusCard;
