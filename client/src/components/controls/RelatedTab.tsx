import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { controlService, Control } from '@/services/controlService';

interface RelatedTabProps {
  control: Control;
}

export const RelatedTab: React.FC<RelatedTabProps> = ({ control }) => {
  const navigate = useNavigate();

  // Fetch controls from the same family
  const { data: relatedData } = useQuery({
    queryKey: ['controls', { family: control.family }],
    queryFn: () => controlService.getAllControls({ family: control.family, limit: 100 }),
  });

  const relatedControls =
    relatedData?.data?.filter((c: Control) => c.id !== control.id) || [];

  return (
    <Box sx={{ px: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#E0E0E0' }}>
        Related Controls
      </Typography>

      <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 2 }}>
        Other controls in the {control.family} family
      </Typography>

      {relatedControls.length > 0 ? (
        <List>
          {relatedControls.map((relatedControl: Control) => (
            <Paper
              key={relatedControl.id}
              variant="outlined"
              sx={{
                mb: 1,
                backgroundColor: '#242424',
                borderColor: '#4A4A4A',
              }}
            >
              <ListItemButton onClick={() => navigate(`/controls/${relatedControl.id}`)}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontWeight="medium" sx={{ color: '#90CAF9', fontFamily: 'monospace' }}>
                        {relatedControl.controlId}
                      </Typography>
                      <Chip
                        label={relatedControl.status?.status || 'Not Started'}
                        size="small"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" sx={{ color: '#B0B0B0' }} noWrap>
                      {relatedControl.title}
                    </Typography>
                  }
                />
              </ListItemButton>
            </Paper>
          ))}
        </List>
      ) : (
        <Typography variant="body2" sx={{ color: '#B0B0B0' }}>
          No other controls in this family
        </Typography>
      )}
    </Box>
  );
};

export default RelatedTab;
