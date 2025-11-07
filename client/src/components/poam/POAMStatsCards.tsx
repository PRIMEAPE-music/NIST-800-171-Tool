import React from 'react';
import { Box, Paper, Typography, Grid } from '@mui/material';
import {
  Assignment,
  Schedule,
  CheckCircle,
  Warning,
  TrendingUp,
} from '@mui/icons-material';
import { PoamStats } from '../../types/poam.types';

interface POAMStatsCardsProps {
  stats: PoamStats | undefined;
}

export const POAMStatsCards: React.FC<POAMStatsCardsProps> = ({ stats }) => {
  if (!stats) return null;

  const cards = [
    {
      title: 'Total POAMs',
      value: stats.total,
      icon: <Assignment sx={{ fontSize: 40, color: '#90CAF9' }} />,
      color: '#90CAF9',
    },
    {
      title: 'In Progress',
      value: stats.byStatus['In Progress'],
      icon: <Schedule sx={{ fontSize: 40, color: '#FFA726' }} />,
      color: '#FFA726',
    },
    {
      title: 'Completed',
      value: stats.byStatus.Completed,
      icon: <CheckCircle sx={{ fontSize: 40, color: '#66BB6A' }} />,
      color: '#66BB6A',
    },
    {
      title: 'Overdue',
      value: stats.overdue,
      icon: <Warning sx={{ fontSize: 40, color: '#F44336' }} />,
      color: '#F44336',
    },
    {
      title: 'Completed This Month',
      value: stats.completedThisMonth,
      icon: <TrendingUp sx={{ fontSize: 40, color: '#42A5F5' }} />,
      color: '#42A5F5',
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={2.4} key={card.title}>
          <Paper
            sx={{
              p: 2,
              bgcolor: '#242424',
              borderLeft: `4px solid ${card.color}`,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 1,
              }}
            >
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.title}
                </Typography>
              </Box>
              {card.icon}
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};
