import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';

export const useAccessToken = () => {
  const { instance, accounts } = useMsal();

  const getAccessToken = async (scopes: string[]): Promise<string | null> => {
    if (accounts.length === 0) {
      return null;
    }

    try {
      // Try silent token acquisition first
      const response = await instance.acquireTokenSilent({
        scopes,
        account: accounts[0],
      });

      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Fall back to interactive method
        try {
          const response = await instance.acquireTokenPopup({
            scopes,
            account: accounts[0],
          });
          return response.accessToken;
        } catch (popupError) {
          console.error('Token acquisition failed:', popupError);
          return null;
        }
      }
      console.error('Token acquisition error:', error);
      return null;
    }
  };

  return { getAccessToken };
};
