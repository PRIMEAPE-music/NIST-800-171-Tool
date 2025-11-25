import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  ArrowBack as BackIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { surveyService } from '../services/survey.service';
import { Survey, SurveyQuestion } from '../types/survey.types';

const SurveyDetail: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | false>(false);
  const [expandedQuestion, setExpandedQuestion] = useState<string | false>(false);

  useEffect(() => {
    if (surveyId) {
      loadSurvey();
    }
  }, [surveyId]);

  const loadSurvey = async () => {
    if (!surveyId) return;

    try {
      setLoading(true);
      const data = await surveyService.getSurvey(surveyId);
      setSurvey(data);
      setError(null);
    } catch (err) {
      console.error('Error loading survey:', err);
      setError('Failed to load survey details');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (sectionId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSection(isExpanded ? sectionId : false);
  };

  const handleQuestionChange = (questionId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedQuestion(isExpanded ? questionId : false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getRiskColor = (score: number | null) => {
    if (!score) return '#666';
    if (score >= 4) return '#f44336'; // Critical - red
    return '#ff9800'; // High - orange (1-3)
  };

  const getRiskLabel = (score: number | null) => {
    if (!score) return 'N/A';
    if (score >= 4) return 'Critical';
    return 'High'; // 1-3
  };

  const renderAnswer = (question: SurveyQuestion) => {
    const answer = question.answers?.[0];

    if (!answer) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No answer provided for this question
        </Alert>
      );
    }

    return (
      <Card sx={{ mt: 2, bgcolor: '#242424', border: '1px solid #2C2C2C' }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#1976d2' }}>
            Given Answer:
          </Typography>

          {/* Selected Option */}
          {answer.selectedOption && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Selected:
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckIcon sx={{ fontSize: 16, color: '#4caf50', mr: 1 }} />
                  <Typography variant="body2">{answer.selectedOption}</Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* Comments */}
          {answer.comments && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Comments:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: '#1E1E1E', border: '1px solid #2C2C2C' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {answer.comments}
                </Typography>
              </Paper>
            </Box>
          )}

          <Divider sx={{ my: 2, borderColor: '#2C2C2C' }} />

          {/* Metadata */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {answer.answeredBy && (
              <Chip
                label={`By: ${answer.answeredBy}`}
                size="small"
                sx={{ bgcolor: '#2C2C2C' }}
              />
            )}
            {answer.answeredDate && (
              <Chip
                label={`Date: ${formatDate(answer.answeredDate)}`}
                size="small"
                sx={{ bgcolor: '#2C2C2C' }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const getTotalRiskColor = (total: number) => {
    if (total >= 20) return '#f44336'; // Critical - red
    if (total >= 10) return '#ff9800'; // High - orange
    return '#666'; // Below 10 - gray
  };

  const getTotalRiskLabel = (total: number) => {
    if (total >= 20) return 'Critical';
    if (total >= 10) return 'High';
    return ''; // No label for low scores
  };

  const renderScoring = (question: SurveyQuestion) => {
    if (!question.likelihood && !question.overallImpact) {
      return null;
    }

    const riskTotal = (question.likelihood || 0) * (question.overallImpact || 0);

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Risk Scoring:
        </Typography>
        <Grid container spacing={2}>
          {question.likelihood && (
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, bgcolor: '#242424', border: '1px solid #2C2C2C' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Likelihood:
                  </Typography>
                  <Chip
                    label={`${question.likelihood} - ${getRiskLabel(question.likelihood)}`}
                    size="small"
                    sx={{
                      bgcolor: getRiskColor(question.likelihood),
                      color: '#fff',
                      fontWeight: 600
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          )}
          {question.overallImpact && (
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, bgcolor: '#242424', border: '1px solid #2C2C2C' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Overall Impact:
                  </Typography>
                  <Chip
                    label={`${question.overallImpact} - ${getRiskLabel(question.overallImpact)}`}
                    size="small"
                    sx={{
                      bgcolor: getRiskColor(question.overallImpact),
                      color: '#fff',
                      fontWeight: 600
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          )}
          {question.likelihood && question.overallImpact && (
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, bgcolor: '#242424', border: '1px solid #2C2C2C' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Risk Total:
                  </Typography>
                  <Chip
                    label={getTotalRiskLabel(riskTotal) ? `${riskTotal} - ${getTotalRiskLabel(riskTotal)}` : `${riskTotal}`}
                    size="small"
                    sx={{
                      bgcolor: getTotalRiskColor(riskTotal),
                      color: '#fff',
                      fontWeight: 600
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !survey) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error || 'Survey not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component={RouterLink}
          to="/surveys"
          sx={{ display: 'flex', alignItems: 'center', color: '#1976d2', textDecoration: 'none' }}
        >
          <BackIcon sx={{ mr: 0.5, fontSize: 20 }} />
          Surveys
        </Link>
        <Typography color="text.primary">{survey.name}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#1E1E1E', border: '1px solid #2C2C2C' }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          {survey.name}
        </Typography>
        {survey.description && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {survey.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`${survey.sections?.length || 0} Sections`}
            size="small"
            sx={{ bgcolor: '#2C2C2C' }}
          />
          <Chip
            label={`Created: ${formatDate(survey.createdDate)}`}
            size="small"
            sx={{ bgcolor: '#2C2C2C' }}
          />
        </Box>
      </Paper>

      {/* Sections */}
      {survey.sections?.map((section) => (
        <Accordion
          key={section.id}
          expanded={expandedSection === section.sectionId}
          onChange={handleSectionChange(section.sectionId)}
          sx={{
            mb: 2,
            bgcolor: '#1E1E1E',
            border: '1px solid #2C2C2C',
            '&:before': { display: 'none' },
            '&.Mui-expanded': {
              bgcolor: '#242424',
              borderColor: '#1976d2'
            }
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              '&:hover': {
                bgcolor: '#242424'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Section {section.sectionId}: {section.name}
                </Typography>
                {section.riskLevel && (
                  <Typography variant="caption" color="text.secondary">
                    {section.riskLevel}
                  </Typography>
                )}
              </Box>
              <Chip
                label={`${section.questions?.length || 0} Questions`}
                size="small"
                sx={{ bgcolor: '#2C2C2C' }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {/* Questions */}
            {section.questions?.map((question) => (
              <Accordion
                key={question.id}
                expanded={expandedQuestion === question.questionId}
                onChange={handleQuestionChange(question.questionId)}
                sx={{
                  mb: 1,
                  bgcolor: '#242424',
                  border: '1px solid #2C2C2C',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': {
                    bgcolor: '#2C2C2C'
                  }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '&:hover': {
                      bgcolor: '#2C2C2C'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', pr: 2 }}>
                    {question.answers?.[0] ? (
                      <CheckIcon sx={{ color: '#4caf50', mr: 2, mt: 0.5 }} />
                    ) : (
                      <UncheckedIcon sx={{ color: 'text.secondary', mr: 2, mt: 0.5 }} />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {question.questionId}
                      </Typography>
                      <Typography variant="body2">
                        {question.questionText}
                      </Typography>
                      {(question.likelihood || question.overallImpact) && (
                        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                          <WarningIcon sx={{ fontSize: 16, color: '#ff9800' }} />
                          <Typography variant="caption" color="text.secondary">
                            Risk scored
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {/* Help Text */}
                  {question.helpText && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">{question.helpText}</Typography>
                    </Alert>
                  )}

                  {/* Risk Scoring */}
                  {renderScoring(question)}

                  <Divider sx={{ my: 2, borderColor: '#2C2C2C' }} />

                  {/* Render Answer */}
                  {renderAnswer(question)}
                </AccordionDetails>
              </Accordion>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default SurveyDetail;
