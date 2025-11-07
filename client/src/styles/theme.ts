import { createTheme, ThemeOptions } from '@mui/material/styles';

// Dark theme color palette
export const darkColors = {
  // Backgrounds
  background: {
    primary: '#121212',
    secondary: '#1E1E1E',
    elevated: '#2C2C2C',
    paper: '#242424',
  },
  // Text
  text: {
    primary: '#E0E0E0',
    secondary: '#B0B0B0',
    disabled: '#707070',
  },
  // Status colors
  status: {
    notStarted: '#757575',
    inProgress: '#FFA726',
    implemented: '#66BB6A',
    verified: '#42A5F5',
  },
  // Semantic colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  // Borders
  border: 'rgba(255, 255, 255, 0.12)',
  borderLight: 'rgba(255, 255, 255, 0.08)',
};

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#90CAF9',
      light: '#B3D9F2',
      dark: '#5A8AAE',
      contrastText: '#000000',
    },
    secondary: {
      main: '#CE93D8',
      light: '#E1BEE7',
      dark: '#9C27B0',
      contrastText: '#000000',
    },
    background: {
      default: darkColors.background.primary,
      paper: darkColors.background.paper,
    },
    text: {
      primary: darkColors.text.primary,
      secondary: darkColors.text.secondary,
      disabled: darkColors.text.disabled,
    },
    divider: darkColors.borderLight,
    success: {
      main: darkColors.success,
    },
    warning: {
      main: darkColors.warning,
    },
    error: {
      main: darkColors.error,
    },
    info: {
      main: darkColors.info,
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      letterSpacing: '0em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      letterSpacing: '0.00735em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      letterSpacing: '0em',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      letterSpacing: '0.0075em',
    },
    body1: {
      fontSize: '1rem',
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      letterSpacing: '0.01071em',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: `${darkColors.text.disabled} ${darkColors.background.primary}`,
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: '12px',
            height: '12px',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: darkColors.text.disabled,
            border: `3px solid ${darkColors.background.primary}`,
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            backgroundColor: darkColors.background.primary,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: darkColors.background.paper,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          backgroundColor: darkColors.background.paper,
        },
        elevation2: {
          backgroundColor: darkColors.background.elevated,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: darkColors.background.elevated,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: darkColors.background.secondary,
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
};

export const theme = createTheme(themeOptions);

// Status color helper function
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'not started':
    case 'notstarted':
      return darkColors.status.notStarted;
    case 'in progress':
    case 'inprogress':
      return darkColors.status.inProgress;
    case 'implemented':
      return darkColors.status.implemented;
    case 'verified':
      return darkColors.status.verified;
    default:
      return darkColors.text.secondary;
  }
};
