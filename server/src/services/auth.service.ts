import { ConfidentialClientApplication, AuthenticationResult } from '@azure/msal-node';
import { msalConfig, tokenScopes } from '../config/msal.config';

class AuthService {
  private msalClient: ConfidentialClientApplication;
  private tokenCache: Map<string, { token: string; expiresOn: Date }>;

  constructor() {
    this.msalClient = new ConfidentialClientApplication(msalConfig);
    this.tokenCache = new Map();
  }

  /**
   * Acquire access token using client credentials flow
   * This is for app-only access (no user context)
   */
  async acquireToken(scopes: string[] = tokenScopes.graph): Promise<string> {
    try {
      // Check cache first
      const cacheKey = scopes.join(',');
      const cached = this.tokenCache.get(cacheKey);

      if (cached && cached.expiresOn > new Date()) {
        console.log('Using cached token');
        return cached.token;
      }

      // Acquire new token
      const result: AuthenticationResult | null =
        await this.msalClient.acquireTokenByClientCredential({
          scopes: scopes,
          skipCache: false,
        });

      if (!result || !result.accessToken) {
        throw new Error('Failed to acquire access token');
      }

      // Cache the token
      if (result.expiresOn) {
        this.tokenCache.set(cacheKey, {
          token: result.accessToken,
          expiresOn: result.expiresOn,
        });
      }

      console.log('Acquired new access token');
      return result.accessToken;
    } catch (error) {
      console.error('Error acquiring token:', error);
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  /**
   * Validate if we can successfully authenticate
   */
  async validateConnection(): Promise<boolean> {
    try {
      const token = await this.acquireToken();
      return !!token;
    } catch (error) {
      console.error('Connection validation failed:', error);
      return false;
    }
  }

  /**
   * Clear token cache (useful for logout or refresh)
   */
  clearTokenCache(): void {
    this.tokenCache.clear();
    console.log('Token cache cleared');
  }

  /**
   * Get current cache size (for monitoring)
   */
  getCacheSize(): number {
    return this.tokenCache.size;
  }
}

// Export singleton instance
export const authService = new AuthService();
