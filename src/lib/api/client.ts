/**
 * Backend API Client
 * Works with both local development (via Vite proxy) and cloud deployment
 */

import { LOCAL_USER, IS_LOCAL_MODE } from '@/config/local';

// In development, use relative URLs so Vite proxy handles them
// In production, use the environment variable or default
const API_BASE_URL = import.meta.env.DEV
  ? '' // Empty string means relative URLs, which will use Vite proxy
  : (import.meta.env.VITE_API_URL || 'https://api.nutriwealth.com');

// Helper to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('mock_token') || 'dev-user-1';
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

interface ApiResponse<T = any> {
  data: T | null;
  error: Error | null;
}

interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    user_type?: string;
  };
}

interface AuthResponse {
  user: User | null;
  session: {
    access_token: string;
    user: User;
  } | null;
}

class BackendApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Get current auth token (from Cognito or localStorage)
  private async getCurrentAuthToken(): Promise<string | null> {
    const isProductionUrl = this.baseUrl.includes('lambda-url') || this.baseUrl.includes('ajna.cloud') || this.baseUrl.includes('triviz.cloud');
    const authMode = import.meta.env.VITE_AUTH_MODE || (isProductionUrl ? 'cognito' : 'local');

    if (authMode === 'cognito') {
      try {
        const { fetchAuthSession } = await import('aws-amplify/auth');
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (token) {
          this.authToken = token;
          return token;
        }
      } catch (error) {
        console.log('No Cognito session available');
      }
    }

    // Fallback to localStorage for local mode
    const storedToken = localStorage.getItem('auth_token');
    this.authToken = storedToken;
    return storedToken;
  }

  // Helper method to make API requests
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Get current auth token (from Cognito or localStorage)
      const token = await this.getCurrentAuthToken();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      };

      // Fix double slash issue - ensure proper URL construction
      const url = this.baseUrl.endsWith('/') && endpoint.startsWith('/')
        ? `${this.baseUrl}${endpoint.slice(1)}`
        : this.baseUrl.endsWith('/') || endpoint.startsWith('/')
        ? `${this.baseUrl}${endpoint}`
        : `${this.baseUrl}/${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('API Request Error:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  // Authentication methods
  auth = {
    signInWithPassword: async (credentials: {
      email: string;
      password: string;
    }): Promise<ApiResponse<AuthResponse>> => {
      const isProductionUrl = API_BASE_URL.includes('lambda-url') || API_BASE_URL.includes('ajna.cloud') || API_BASE_URL.includes('triviz.cloud');
      const isProductionDomain = typeof window !== 'undefined' && (window.location.hostname.includes('triviz.cloud') || window.location.hostname.includes('ajna.cloud'));

      const authMode = import.meta.env.VITE_AUTH_MODE || (isProductionUrl || isProductionDomain ? 'cognito' : 'local');

      if (authMode === 'cognito') {
        // Use real Cognito authentication
        try {
          // Dynamic import to avoid bundling aws-amplify in local mode if possible
          const { signIn, fetchAuthSession, getCurrentUser, signOut } = await import('aws-amplify/auth');

          let signInResult;
          try {
            signInResult = await signIn({
              username: credentials.email,
              password: credentials.password
            });
          } catch (err: any) {
            // Check for "already signed in" error
            if (err.name === 'UserAlreadyAuthenticatedException' || err.message?.includes('already a signed in user')) {
              console.log('User already signed in, forcing sign out and retrying...');
              await signOut();
              // Retry sign in
              signInResult = await signIn({
                username: credentials.email,
                password: credentials.password
              });
            } else {
              throw err;
            }
          }

          const { isSignedIn, nextStep } = signInResult;

          if (isSignedIn) {
            const user = await getCurrentUser();
            const session = await fetchAuthSession();

            const userInfo: User = {
              id: user.userId,
              email: credentials.email, // Cognito doesn't return email in user object easily without extra fetch
              user_metadata: {
                user_type: 'participant' // Default for now
              }
            };

            const token = session.tokens?.idToken?.toString() || '';
            this.authToken = token;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify(userInfo));

            return {
              data: {
                user: userInfo,
                session: {
                  access_token: token,
                  user: userInfo
                }
              },
              error: null
            };
          }

          if (nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
            const error = new Error('User is not confirmed.');
            error.name = 'UserNotConfirmedException';
            return { data: null, error };
          }

          return { data: null, error: new Error('Sign in incomplete or failed') };
        } catch (error: any) {
          console.error('Cognito sign in error:', error);
          return { data: null, error: error };
        }
      }

      // Mock authentication for local development
      const mockUser: User = {
        id: IS_LOCAL_MODE ? LOCAL_USER.id : credentials.email.split('@')[0],
        email: credentials.email,
        user_metadata: {
          full_name: IS_LOCAL_MODE ? LOCAL_USER.name : 'User',
          user_type: 'participant',
        },
      };

      const mockToken = btoa(`${credentials.email}:${credentials.password}`);
      this.authToken = mockToken;
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      return {
        data: {
          user: mockUser,
          session: {
            access_token: mockToken,
            user: mockUser,
          },
        },
        error: null,
      };
    },

    signUp: async (credentials: {
      email: string;
      password: string;
      options?: {
        data?: {
          full_name?: string;
          user_type?: string;
        };
      };
    }): Promise<ApiResponse<AuthResponse>> => {
      const isProductionUrl = API_BASE_URL.includes('lambda-url') || API_BASE_URL.includes('ajna.cloud') || API_BASE_URL.includes('triviz.cloud');
      const isProductionDomain = typeof window !== 'undefined' && (window.location.hostname.includes('triviz.cloud') || window.location.hostname.includes('ajna.cloud'));
      const authMode = import.meta.env.VITE_AUTH_MODE || (isProductionUrl || isProductionDomain ? 'cognito' : 'local');

      if (authMode === 'cognito') {
        // Use real Cognito sign up
        try {
          const { signUp } = await import('aws-amplify/auth');
          const { isSignUpComplete, userId, nextStep } = await signUp({
            username: credentials.email,
            password: credentials.password,
            options: {
              userAttributes: {
                email: credentials.email,
                name: credentials.options?.data?.full_name || ''
              }
            }
          });

          // Return user data (they'll need to verify email)
          const user: User = {
            id: userId || credentials.email,
            email: credentials.email,
            user_metadata: {
              full_name: credentials.options?.data?.full_name,
              user_type: credentials.options?.data?.user_type || 'participant'
            }
          };

          return {
            data: {
              user,
              session: null // No session until email verified
            },
            error: null
          };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      }

      // Mock sign up for local development
      const { data: userData, error: userError } = await this.request<any>('/users', {
        method: 'POST',
        body: JSON.stringify({
          id: `user-${Date.now()}`,
          email: credentials.email,
          full_name: credentials.options?.data?.full_name || '',
          user_type: credentials.options?.data?.user_type || 'participant',
        }),
      });

      if (userError) {
        return { data: null, error: userError };
      }

      // Sign in after signup
      return this.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
    },

    confirmSignUp: async (username: string, code: string): Promise<ApiResponse<void>> => {
      const isProductionUrl = API_BASE_URL.includes('lambda-url') || API_BASE_URL.includes('ajna.cloud') || API_BASE_URL.includes('triviz.cloud');
      const isProductionDomain = typeof window !== 'undefined' && (window.location.hostname.includes('triviz.cloud') || window.location.hostname.includes('ajna.cloud'));
      const authMode = import.meta.env.VITE_AUTH_MODE || (isProductionUrl || isProductionDomain ? 'cognito' : 'local');

      if (authMode === 'cognito') {
        try {
          const { confirmSignUp } = await import('aws-amplify/auth');
          await confirmSignUp({
            username,
            confirmationCode: code
          });
          return { data: undefined, error: null };
        } catch (error) {
          console.error('Cognito confirm sign up error:', error);
          return { data: null, error: error as Error };
        }
      }

      // Mock confirmation
      return { data: undefined, error: null };
    },

    signOut: async (): Promise<ApiResponse<void>> => {
      // Clear auth token
      this.authToken = null;

      // Clear all auth-related localStorage items
      const keysToRemove = Object.keys(localStorage).filter(key =>
        key.includes('CognitoIdentityServiceProvider') ||
        key.includes('amplify') ||
        key.includes('aws') ||
        key === 'auth_token' ||
        key === 'user'
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear all auth-related sessionStorage items
      const sessionKeys = Object.keys(sessionStorage).filter(key =>
        key.includes('CognitoIdentityServiceProvider') ||
        key.includes('amplify') ||
        key.includes('aws')
      );
      sessionKeys.forEach(key => sessionStorage.removeItem(key));

      return { data: undefined, error: null };
    },

    getUser: async (): Promise<ApiResponse<User>> => {
      const isProductionUrl = API_BASE_URL.includes('lambda-url') || API_BASE_URL.includes('ajna.cloud') || API_BASE_URL.includes('triviz.cloud');
      const authMode = import.meta.env.VITE_AUTH_MODE || (isProductionUrl ? 'cognito' : 'local');

      if (authMode === 'cognito') {
        try {
          const { getCurrentUser, fetchAuthSession } = await import('aws-amplify/auth');
          const user = await getCurrentUser();
          const session = await fetchAuthSession();

          if (user && session.tokens) {
            // Get user email from localStorage if stored during sign in
            const storedUser = localStorage.getItem('user');
            let email = '';
            if (storedUser) {
              try {
                const parsed = JSON.parse(storedUser);
                email = parsed.email || '';
              } catch {}
            }

            const userData: User = {
              id: user.userId,
              email: email || user.username,
              user_metadata: {
                user_type: 'participant'
              }
            };
            return { data: userData, error: null };
          }
        } catch (error) {
          console.log('No Cognito user session');
        }
      }

      // Fallback to localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        return { data: null, error: new Error('No user found') };
      }

      try {
        const user = JSON.parse(userStr);
        return { data: user, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    getSession: async () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('auth_token');

      if (!userStr || !token) {
        return { data: { session: null }, error: null };
      }

      try {
        const user = JSON.parse(userStr);
        return {
          data: {
            session: {
              access_token: token,
              user,
            },
          },
          error: null,
        };
      } catch (error) {
        return { data: { session: null }, error: error as Error };
      }
    },
  };

  // Database query builder with chaining support
  from(table: string) {
    const queryBuilder = {
      _table: table,
      _filters: [] as Array<{ column: string; operator: string; value: any }>,
      _orderBy: null as { column: string; ascending: boolean } | null,
      _limitCount: null as number | null,
      _selectColumns: '*',

      select: function (columns = '*') {
        this._selectColumns = columns;
        return this;
      },

      insert: async function (records: any | any[]) {
        try {
          const response = await fetch(`${API_BASE_URL}/v1/${table}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(localStorage.getItem('auth_token') && {
                Authorization: `Bearer ${localStorage.getItem('auth_token')}`
              })
            },
            body: JSON.stringify(records)
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          return { data, error: null };
        } catch (error) {
          console.error(`Error inserting into ${table}:`, error);
          // Production grade: Do not fail over to mock data silently
          return { data: null, error: error as Error };
        }
      },

      update: function (updates: any) {
        const self = this;
        return {
          eq: async function (column: string, value: any) {
            const url = `${API_BASE_URL}/v1/${self._table}?${column}=${value}`;
            try {
              const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  ...getAuthHeaders()
                },
                body: JSON.stringify(updates)
              });

              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              return { data, error: null };
            } catch (error) {
              return { data: null, error: error as Error };
            }
          },
        };
      },

      delete: function () {
        const self = this;
        return {
          eq: async function (column: string, value: any) {
            // Mock delete
            const existing = JSON.parse(localStorage.getItem(`mock_table_${self._table}`) || '[]');
            const filtered = existing.filter((item: any) => item[column] !== value);
            localStorage.setItem(`mock_table_${self._table}`, JSON.stringify(filtered));
            return { data: null, error: null };
          },
        };
      },

      // Query filters (chainable)
      eq: function (column: string, value: any) {
        this._filters.push({ column, operator: 'eq', value });
        return this;
      },

      neq: function (column: string, value: any) {
        this._filters.push({ column, operator: 'neq', value });
        return this;
      },

      gt: function (column: string, value: any) {
        this._filters.push({ column, operator: 'gt', value });
        return this;
      },

      gte: function (column: string, value: any) {
        this._filters.push({ column, operator: 'gte', value });
        return this;
      },

      lt: function (column: string, value: any) {
        this._filters.push({ column, operator: 'lt', value });
        return this;
      },

      lte: function (column: string, value: any) {
        this._filters.push({ column, operator: 'lte', value });
        return this;
      },

      in: function (column: string, values: any[]) {
        this._filters.push({ column, operator: 'in', value: values });
        return this;
      },

      is: function (column: string, value: any) {
        this._filters.push({ column, operator: 'is', value });
        return this;
      },

      order: function (column: string, options?: { ascending?: boolean }) {
        this._orderBy = { column, ascending: options?.ascending ?? true };
        return this;
      },

      limit: function (count: number) {
        this._limitCount = count;
        return this;
      },

      single: async function () {
        const result = await this.execute();
        if (result.error) return { data: null, error: result.error };
        const data = result.data;
        if (!data || data.length === 0) {
          return { data: null, error: new Error('No rows found') };
        }
        return { data: data[0], error: null };
      },

      // Execute the query - Use real backend API with fallback
      execute: async function () {
        try {
          // Build query parameters - use simple format for backend
          const params = new URLSearchParams();

          // Add filters as simple key=value pairs
          for (const filter of this._filters) {
            // Backend expects simple params like user_id=123
            if (filter.operator === 'eq') {
              params.append(filter.column, filter.value);
            }
          }

          // Add ordering (if backend supports it)
          if (this._orderBy) {
            params.append('order_by', this._orderBy.column);
            params.append('order_dir', this._orderBy.ascending ? 'asc' : 'desc');
          }

          // Add limit
          if (this._limitCount !== null) {
            params.append('limit', this._limitCount.toString());
          }

          const queryString = params.toString();
          const url = `${API_BASE_URL}/v1/${this._table}${queryString ? `?${queryString}` : ''}`;

          const response = await fetch(url, {
            headers: getAuthHeaders()
          });

          if (!response.ok) {
            if (response.status === 404) {
              // Table doesn't exist in backend, use localStorage fallback
              let data = JSON.parse(localStorage.getItem(`mock_table_${this._table}`) || '[]');

              // Apply filters
              for (const filter of this._filters) {
                if (filter.operator === 'eq') {
                  data = data.filter((item: any) => item[filter.column] === filter.value);
                } else if (filter.operator === 'is') {
                  if (filter.value === null) {
                    data = data.filter((item: any) => item[filter.column] === null || item[filter.column] === undefined);
                  } else {
                    data = data.filter((item: any) => item[filter.column] === filter.value);
                  }
                }
              }

              // Apply limit
              if (this._limitCount !== null) {
                data = data.slice(0, this._limitCount);
              }

              return { data, error: null };
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          return { data, error: null };
        } catch (error) {
          console.error(`Error fetching from ${this._table}:`, error);
          // Fallback to empty array for reads
          return { data: [], error: null };
        }
      },

      // Make it thenable for async/await
      then: async function (resolve: any, reject: any) {
        try {
          const result = await this.execute();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }
    };

    return queryBuilder;
  }

  // Real-time features (stubbed for local development)
  channel(name: string) {
    console.log(`Mock channel created: ${name}`);
    return {
      on: (event: string, options: any, callback: any) => {
        console.log(`Mock subscription to ${event} on channel ${name}`);
        // Return the channel object for chaining
        return {
          subscribe: () => {
            console.log(`Mock channel ${name} subscribed`);
            return { status: 'SUBSCRIBED' };
          }
        };
      },
      subscribe: () => {
        console.log(`Mock channel ${name} subscribed`);
        return { status: 'SUBSCRIBED' };
      }
    };
  }

  removeChannel(channel: any) {
    console.log('Mock channel removed');
  }

  // Edge functions (for invitation redemption, etc.)
  functions = {
    invoke: async (functionName: string, options: { body: any }) => {
      if (functionName === 'redeem-invitation') {
        // Mock invitation redemption
        console.log('Mock: Redeeming invitation with code:', options.body.invitationCode);
        return { data: { success: true }, error: null };
      }

      if (functionName === 'async-analyze' || functionName === 'auto-classify-and-analyze') {
        // Mock AI analysis
        console.log('Mock: Analyzing content:', options.body);

        const mockAnalysis = {
          classification: options.body.image_url ? 'food' : 'text',
          analysis: {
            food_items: [
              {
                name: options.body.description || 'Analyzed Food Item',
                calories: Math.floor(Math.random() * 500) + 200,
                protein: Math.floor(Math.random() * 30) + 10,
                carbs: Math.floor(Math.random() * 50) + 20,
                fat: Math.floor(Math.random() * 20) + 5,
              }
            ],
            total_calories: Math.floor(Math.random() * 800) + 300,
            nutritional_summary: 'Mock analysis complete. This is a development mode response.',
            health_notes: 'This is mock data for development purposes.',
          },
          confidence: 0.95,
          processing_time: 1.2,
        };

        return { data: mockAnalysis, error: null };
      }

      if (functionName === 'app-version') {
        // Mock app version
        return { data: { version: 'v1.0.0' }, error: null };
      }

      return {
        data: null,
        error: new Error(`Function ${functionName} not implemented in mock mode`),
      };
    },
  };
}

// Create and export the client instance
export const backendApi = new BackendApiClient(API_BASE_URL);
