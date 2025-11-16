import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { AccountInfo } from '@azure/msal-browser';
import { loginRequest } from '../config/msal.config';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AccountInfo | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { instance, accounts, inProgress } = useMsal();
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set initial user if already logged in
    if (accounts.length > 0) {
      setUser(accounts[0]);
    }
    setIsLoading(false);
  }, [accounts]);

  const login = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use popup for login (can also use redirect)
      const response = await instance.loginPopup(loginRequest);
      setUser(response.account);
    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [instance]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await instance.logoutPopup({
        mainWindowRedirectUri: '/',
      });
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [instance]);

  const value: AuthContextType = useMemo(() => ({
    isAuthenticated: accounts.length > 0,
    user,
    login,
    logout,
    isLoading: isLoading || inProgress !== 'none',
    error,
  }), [accounts.length, user, login, logout, isLoading, inProgress, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
