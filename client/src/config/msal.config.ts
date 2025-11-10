import { Configuration, PopupRequest } from '@azure/msal-browser';

// MSAL configuration for React (Interactive/Delegated auth)
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  },
  cache: {
    cacheLocation: 'sessionStorage', // or 'localStorage'
    storeAuthStateInCookie: false, // Set to true for IE11/Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;

        switch (level) {
          case 0: // Error
            console.error(message);
            break;
          case 1: // Warning
            console.warn(message);
            break;
          case 2: // Info
            console.info(message);
            break;
          case 3: // Verbose
            console.debug(message);
            break;
        }
      },
    },
  },
};

// Scopes for login request
export const loginRequest: PopupRequest = {
  scopes: ['User.Read'],
};

// Scopes for Graph API calls
export const graphScopes = {
  user: ['User.Read'],
  deviceManagement: [
    'DeviceManagementConfiguration.Read.All',
    'DeviceManagementManagedDevices.Read.All',
  ],
  informationProtection: ['InformationProtectionPolicy.Read.All'],
  security: ['SecurityEvents.Read.All'],
  directory: ['Directory.Read.All', 'Policy.Read.All'],
};

// All scopes combined for initial consent
export const allScopes: PopupRequest = {
  scopes: [
    'User.Read',
    'DeviceManagementConfiguration.Read.All',
    'DeviceManagementManagedDevices.Read.All',
    'InformationProtectionPolicy.Read.All',
    'SecurityEvents.Read.All',
    'Directory.Read.All',
    'Policy.Read.All',
  ],
};
