import React from 'react'
import { createRoot } from 'react-dom/client'
import AppOptimized from './AppOptimized.tsx'
import './index.css'

// Only register service worker in production to avoid caching issues during development
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);

        // Check for updates every 30 minutes
        setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);

        // Listen for waiting service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New service worker available');
                // The new service worker is available
                window.dispatchEvent(new CustomEvent('sw-update-available', {
                  detail: { registration }
                }));
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
} else if ('serviceWorker' in navigator) {
  // In development: unregister service workers and clear caches
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('🧹 Unregistered service worker for development');
    });
  });

  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
        console.log('🧹 Cleared cache:', name);
      });
    });
  }
}

// Get auth mode from environment
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'local';
const IS_DEVELOPMENT = import.meta.env.DEV;

async function init() {
  const container = document.getElementById("root");
  if (!container) {
    throw new Error('Root element not found');
  }
  const root = createRoot(container);

  // Render the app immediately to avoid blank screen
  root.render(
    <React.StrictMode>
      <AppOptimized />
    </React.StrictMode>
  );

  // Configure Amplify after initial render if needed
  if (AUTH_MODE === 'cognito') {
    try {
      let config = null;

      // Try to get config from environment variables first (for local dev with prod backend)
      if (import.meta.env.VITE_USER_POOL_ID && import.meta.env.VITE_USER_POOL_CLIENT_ID) {
        config = {
          region: import.meta.env.VITE_AWS_REGION || 'ap-south-1',
          userPoolId: import.meta.env.VITE_USER_POOL_ID,
          userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID
        };
        console.log('Using Cognito config from environment variables');
      } else if (!IS_DEVELOPMENT) {
        // In production, fetch auth config from backend
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}/v1/auth/config`);

        if (response.ok) {
          config = await response.json();
        }
      }

      if (config && config.userPoolId && config.userPoolClientId) {
        // Dynamically import Amplify only when needed
        const { Amplify } = await import('aws-amplify');

        Amplify.configure({
          Auth: {
            Cognito: {
              region: config.region || 'ap-south-1',
              userPoolId: config.userPoolId,
              userPoolClientId: config.userPoolClientId,
              loginWith: {
                email: true
              }
            }
          }
        });
        console.log('✅ Amplify configured with Cognito for production');
      }
    } catch (error) {
      console.error('Failed to configure Cognito:', error);
      // Don't throw - app should still work without Cognito
    }
  } else {
    console.log(`🔧 Running in ${IS_DEVELOPMENT ? 'development' : AUTH_MODE} mode`);
  }
}

init().catch(console.error);
