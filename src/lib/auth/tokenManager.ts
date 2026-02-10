/**
 * Centralized Token Management Service
 * Handles all token retrieval and storage operations
 */

import { fetchAuthSession } from 'aws-amplify/auth';

class TokenManager {
  private static instance: TokenManager;
  private cachedToken: string | null = null;
  private tokenExpiry: number | null = null;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Get the current authentication token
   * Handles both Cognito and local development modes
   */
  async getToken(): Promise<string | null> {
    const authMode = this.getAuthMode();

    if (authMode === 'cognito') {
      return this.getCognitoToken();
    } else if (authMode === 'local') {
      return this.getLocalToken();
    }

    return null;
  }

  /**
   * Get token synchronously (for legacy code)
   * WARNING: This may return stale tokens. Prefer getToken() when possible.
   */
  getTokenSync(): string | null {
    // Check cache first
    if (this.cachedToken && this.tokenExpiry && this.tokenExpiry > Date.now()) {
      return this.cachedToken;
    }

    // Try to get from Cognito storage directly
    const keys = Object.keys(localStorage);
    const idTokenKey = keys.find(key =>
      key.includes('CognitoIdentityServiceProvider') &&
      key.endsWith('idToken')
    );

    if (idTokenKey) {
      const token = localStorage.getItem(idTokenKey);
      if (token) {
        // Parse token to get expiry
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const exp = payload.exp * 1000; // Convert to milliseconds
            if (exp > Date.now()) {
              this.cachedToken = token;
              this.tokenExpiry = exp;
              return token;
            }
          }
        } catch (e) {
          console.warn('Failed to parse token:', e);
        }
      }
    }

    // Fallback for local mode
    return localStorage.getItem('mock_token') || null;
  }

  /**
   * Get authorization headers with the current token
   */
  async getAuthHeaders(): Promise<HeadersInit> {
    const token = await this.getToken();
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get authorization headers synchronously (for legacy code)
   */
  getAuthHeadersSync(): HeadersInit {
    const token = this.getTokenSync();
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Clear all stored tokens and cache
   */
  clearTokens(): void {
    this.cachedToken = null;
    this.tokenExpiry = null;

    // Clear old auth_token if it exists
    localStorage.removeItem('auth_token');

    // Clear Cognito tokens
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('CognitoIdentityServiceProvider')) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Refresh the current token
   */
  async refreshToken(): Promise<string | null> {
    const authMode = this.getAuthMode();

    if (authMode === 'cognito') {
      try {
        const session = await fetchAuthSession({ forceRefresh: true });
        const token = session.tokens?.idToken?.toString() || null;
        if (token) {
          this.updateCache(token);
        }
        return token;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        return null;
      }
    }

    return this.getLocalToken();
  }

  private async getCognitoToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession({ forceRefresh: false });
      const token = session.tokens?.idToken?.toString() || null;
      if (token) {
        this.updateCache(token);
      }
      return token;
    } catch (error) {
      console.log('No Cognito session available');

      // Try to get from storage as fallback
      return this.getTokenSync();
    }
  }

  private getLocalToken(): string | null {
    // For local development, use mock token
    const mockToken = localStorage.getItem('mock_token');
    if (mockToken) {
      return mockToken;
    }

    // Generate a mock token for local dev
    const localUserId = 'dev-user-1';
    const token = btoa(`local:${localUserId}`);
    localStorage.setItem('mock_token', token);
    return token;
  }

  private getAuthMode(): string {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const isProductionUrl =
      apiUrl.includes('lambda-url') ||
      apiUrl.includes('ajna.cloud') ||
      apiUrl.includes('triviz.cloud') ||
      (typeof window !== 'undefined' && (
        window.location.hostname.includes('triviz.cloud') ||
        window.location.hostname.includes('ajna.cloud')
      ));

    return import.meta.env.VITE_AUTH_MODE || (isProductionUrl ? 'cognito' : 'local');
  }

  private updateCache(token: string): void {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const exp = payload.exp * 1000; // Convert to milliseconds
        this.cachedToken = token;
        this.tokenExpiry = exp;
      }
    } catch (e) {
      console.warn('Failed to parse token for caching:', e);
      this.cachedToken = token;
      this.tokenExpiry = Date.now() + 3600000; // Default 1 hour
    }
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();

// Export convenience functions
export const getAuthToken = () => tokenManager.getToken();
export const getAuthTokenSync = () => tokenManager.getTokenSync();
export const getAuthHeaders = () => tokenManager.getAuthHeaders();
export const getAuthHeadersSync = () => tokenManager.getAuthHeadersSync();
export const clearAuthTokens = () => tokenManager.clearTokens();
export const refreshAuthToken = () => tokenManager.refreshToken();