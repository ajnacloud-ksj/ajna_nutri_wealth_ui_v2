import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { backendApi } from "@/lib/api/client";

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    user_type?: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    try {
      const { data, error } = await backendApi.auth.getUser();
      if (error) throw error;
      setUser(data as User);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const signOut = async () => {
    try {
      // Check if we need to sign out from Cognito
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const isProduction = apiUrl.includes('lambda-url') || apiUrl.includes('ajna.cloud') || apiUrl.includes('triviz.cloud');
      const authMode = import.meta.env.VITE_AUTH_MODE || (isProduction ? 'cognito' : 'local');

      if (authMode === 'cognito') {
        try {
          const { signOut } = await import('aws-amplify/auth');
          await signOut();
        } catch (cognitoError) {
          console.error('Cognito sign out error:', cognitoError);
        }
      }

      // Always clear all local storage items regardless of auth mode
      // Clear Amplify/Cognito tokens
      const keysToRemove = Object.keys(localStorage).filter(key =>
        key.includes('CognitoIdentityServiceProvider') ||
        key.includes('amplify') ||
        key.includes('aws') ||
        key === 'auth_token' ||
        key === 'user'
      );

      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Also clear session storage
      const sessionKeys = Object.keys(sessionStorage).filter(key =>
        key.includes('CognitoIdentityServiceProvider') ||
        key.includes('amplify') ||
        key.includes('aws')
      );

      sessionKeys.forEach(key => sessionStorage.removeItem(key));

      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
