import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  ViewList as ListIcon,
  ViewModule as CardIcon,
  Assignment as SurveyIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { surveyService } from '../services/survey.service';
import { Survey } from '../types/survey.types';

const Surveys: React.FC = () => {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const data = await surveyService.getAllSurveys();
      setSurveys(data);
      setError(null);
    } catch (err) {
      console.error('Error loading surveys:', err);
      setError('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  const handleSurveyClick = (surveyId: string) => {
    navigate(`/surveys/${surveyId}`);
  };

  const getSurveyStats = (survey: Survey) => {
    const sectionCount = survey.sections?.length || 0;
    const questionCount = survey.sections?.reduce(
      (sum, section) => sum + (section._count?.questions || 0),
      0
    ) || 0;
    return { sectionCount, questionCount };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Cybersecurity Surveys
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage compliance questionnaires
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => newMode && setViewMode(newMode)}
          aria-label="view mode"
          size="small"
        >
          <ToggleButton value="card" aria-label="card view">
            <CardIcon sx={{ mr: 1 }} />
            Card
          </ToggleButton>
          <ToggleButton value="list" aria-label="list view">
            <ListIcon sx={{ mr: 1 }} />
            List
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Card View */}
      {viewMode === 'card' && (
        <Grid container spacing={3}>
          {surveys.map((survey) => {
            const stats = getSurveyStats(survey);
            return (
              <Grid item xs={12} sm={6} md={4} key={survey.id}>
                <Card
                  sx={{
                    height: '100%',
                    bgcolor: '#1E1E1E',
                    border: '1px solid #2C2C2C',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: '#242424',
                      borderColor: '#1976d2',
                      transform: 'translateY(-4px)',
                      boxShadow: '0 4px 20px rgba(25, 118, 210, 0.15)'
                    }
                  }}
                >
                  <CardActionArea
                    onClick={() => handleSurveyClick(survey.surveyId)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <SurveyIcon sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {survey.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(survey.createdDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>

                      {survey.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2, minHeight: 40 }}
                        >
                          {survey.description}
                        </Typography>
                      )}

                      <Divider sx={{ my: 2, borderColor: '#2C2C2C' }} />

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`${stats.sectionCount} Sections`}
                          size="small"
                          sx={{ bgcolor: '#2C2C2C' }}
                        />
                        <Chip
                          label={`${stats.questionCount} Questions`}
                          size="small"
                          sx={{ bgcolor: '#2C2C2C' }}
                        />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Paper sx={{ bgcolor: '#1E1E1E', border: '1px solid #2C2C2C' }}>
          <List>
            {surveys.map((survey, index) => {
              const stats = getSurveyStats(survey);
              return (
                <React.Fragment key={survey.id}>
                  {index > 0 && <Divider sx={{ borderColor: '#2C2C2C' }} />}
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleSurveyClick(survey.surveyId)}
                      sx={{
                        py: 2,
                        '&:hover': {
                          bgcolor: '#242424'
                        }
                      }}
                    >
                      <ListItemIcon>
                        <SurveyIcon sx={{ fontSize: 32, color: '#1976d2' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {survey.name}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {survey.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {survey.description}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                              <Chip
                                label={`${stats.sectionCount} Sections`}
                                size="small"
                                sx={{ bgcolor: '#2C2C2C' }}
                              />
                              <Chip
                                label={`${stats.questionCount} Questions`}
                                size="small"
                                sx={{ bgcolor: '#2C2C2C' }}
                              />
                              <Chip
                                label={new Date(survey.createdDate).toLocaleDateString()}
                                size="small"
                                sx={{ bgcolor: '#2C2C2C' }}
                              />
                            </Box>
                          </Box>
                        }
                      />
                      <ChevronRightIcon sx={{ color: 'text.secondary' }} />
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        </Paper>
      )}

      {surveys.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#1E1E1E', border: '1px solid #2C2C2C' }}>
          <SurveyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No surveys available
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Surveys;
