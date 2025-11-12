import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch'; // Required for Graph client
import { authService } from './auth.service';

class GraphClientService {
  private client: Client | null = null;

  /**
   * Get authenticated Graph client instance
   */
  async getClient(): Promise<Client> {
    if (!this.client) {
      const token = await authService.acquireToken();

      this.client = Client.init({
        authProvider: (done) => {
          done(null, token);
        },
      });
    }

    return this.client;
  }

  /**
   * Reset client (forces new token acquisition on next request)
   */
  resetClient(): void {
    this.client = null;
  }

  /**
   * Make a GET request to Graph API (v1.0)
   */
  async get<T>(endpoint: string): Promise<T> {
    try {
      const client = await this.getClient();
      const response = await client.api(endpoint).get();
      return response as T;
    } catch (error) {
      console.error(`Graph API GET error on ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Make a GET request to Graph API beta endpoint
   */
  async getBeta<T>(endpoint: string): Promise<T> {
    try {
      const client = await this.getClient();
      const response = await client.api(endpoint).version('beta').get();
      return response as T;
    } catch (error) {
      console.error(`Graph API BETA GET error on ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Make a POST request to Graph API
   */
  async post<T>(endpoint: string, data: any): Promise<T> {
    try {
      const client = await this.getClient();
      const response = await client.api(endpoint).post(data);
      return response as T;
    } catch (error) {
      console.error(`Graph API POST error on ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Test connection to Graph API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to get organization info as a simple test
      await this.get('/organization');
      return true;
    } catch (error) {
      console.error('Graph API connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const graphClientService = new GraphClientService();
