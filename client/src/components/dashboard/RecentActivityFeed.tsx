import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface ActivityItem {
  id: number;
  controlId: number;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  control: {
    controlId: string;
    title: string;
  };
}

interface RecentActivityFeedProps {
  activity: ActivityItem[];
}

const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ activity }) => {
  const navigate = useNavigate();

  const getActivityDescription = (item: ActivityItem) => {
    switch (item.fieldChanged) {
      case 'status':
        return `Status changed from "${item.oldValue}" to "${item.newValue}"`;
      case 'implementationNotes':
        return 'Implementation notes updated';
      case 'assignedTo':
        return `Assigned to ${item.newValue}`;
      default:
        return `${item.fieldChanged} updated`;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card sx={{ height: '100%', backgroundColor: '#242424' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
          Recent Activity
        </Typography>

        {activity.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
              No recent activity
            </Typography>
          </Box>
        ) : (
          <List dense>
            {activity.map((item) => (
              <ListItem
                key={item.id}
                sx={{
                  px: 0,
                  cursor: 'pointer',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                  }
                }}
                onClick={() => navigate(`/controls/${item.controlId}`)}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip
                        label={item.control.controlId}
                        size="small"
                        sx={{ fontSize: '0.7rem', bgcolor: 'rgba(144, 202, 249, 0.1)', color: '#90CAF9' }}
                      />
                      <Typography variant="caption" sx={{ color: '#B0B0B0' }}>
                        {formatTime(item.changedAt)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" component="span" sx={{ color: '#E0E0E0' }}>
                        {getActivityDescription(item)}
                      </Typography>
                      <Typography
                        variant="caption"
                        component="div"
                        noWrap
                        sx={{ color: '#B0B0B0', mt: 0.5 }}
                      >
                        {item.control.title}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivityFeed;
