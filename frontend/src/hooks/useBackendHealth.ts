import { useState, useEffect, useCallback } from 'react';

interface HealthStatus {
  isOnline: boolean;
  lastChecked: Date | null;
  error: string | null;
}

const HEALTH_CHECK_INTERVAL = 15000; // 15 seconds
const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://commresearch-dev.org.ohio-state.edu';

export const useBackendHealth = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    isOnline: true, // Assume online initially
    lastChecked: null,
    error: null
  });

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setHealthStatus({
          isOnline: true,
          lastChecked: new Date(),
          error: null
        });
        console.log('✅ Backend health check: OK', data);
      } else {
        setHealthStatus({
          isOnline: false,
          lastChecked: new Date(),
          error: `Server responded with status ${response.status}`
        });
        console.warn('⚠️ Backend health check: Server error', response.status);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setHealthStatus({
        isOnline: false,
        lastChecked: new Date(),
        error: errorMessage
      });
      console.error('❌ Backend health check failed:', errorMessage);
    }
  }, []);

  useEffect(() => {
    // Check immediately on mount
    checkHealth();

    // Set up interval to check every 15 seconds
    const intervalId = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [checkHealth]);

  return healthStatus;
};

