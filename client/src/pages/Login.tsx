import React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    await login();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h4" gutterBottom>
            NIST 800-171 Rev3
          </Typography>
          <Typography variant="h5" gutterBottom>
            Compliance Tracker
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 4 }}>
            Sign in with your Microsoft 365 account to access the compliance management system.
          </Typography>

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={handleLogin}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
            sx={{ mt: 2, minWidth: 200 }}
          >
            {isLoading ? 'Signing in...' : 'Sign in with Microsoft'}
          </Button>

          <Typography variant="caption" display="block" sx={{ mt: 3 }} color="text.secondary">
            Requires Microsoft 365 E5 or equivalent license
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
