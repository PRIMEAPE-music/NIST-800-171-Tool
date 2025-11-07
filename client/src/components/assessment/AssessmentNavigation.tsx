import React from 'react';
import { Box, Button } from '@mui/material';
import { ArrowBack, ArrowForward, Check } from '@mui/icons-material';

interface AssessmentNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
  isFirstControl: boolean;
  isLastControl: boolean;
  isCurrentControlAssessed: boolean;
  disabled?: boolean;
}

const AssessmentNavigation: React.FC<AssessmentNavigationProps> = ({
  onPrevious,
  onNext,
  onFinish,
  isFirstControl,
  isLastControl,
  isCurrentControlAssessed,
  disabled = false,
}) => {
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      sx={{ mt: 3 }}
    >
      <Button
        variant="outlined"
        startIcon={<ArrowBack />}
        onClick={onPrevious}
        disabled={isFirstControl || disabled}
      >
        Previous
      </Button>

      <Box>
        {isLastControl ? (
          <Button
            variant="contained"
            endIcon={<Check />}
            onClick={onFinish}
            disabled={disabled}
            sx={{
              bgcolor: 'success.main',
              '&:hover': { bgcolor: 'success.dark' },
            }}
          >
            Finish Assessment
          </Button>
        ) : (
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={onNext}
            disabled={disabled}
          >
            Next Control
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default AssessmentNavigation;
