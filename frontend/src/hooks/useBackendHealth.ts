import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../services/api';

interface HealthStatus {
  isOnline: boolean;
  lastChecked: Date | null;
  error: string | null;
}

const HEALTH_CHECK_DEBOUNCE_MS = 60000; // 60 seconds
// AI-SUGGESTION: Use the same API base as the rest of the frontend to avoid
// mismatches like VITE_API_URL=".../api" causing "/api/api/health".

export const useBackendHealth = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    isOnline: true, // Assume online initially
    lastChecked: null,
    error: null
  });

  // AI-SUGGESTION: Debounced scheduler — any user interaction resets the countdown.
  // The health check runs 60s after the last detected activity.
  const scheduledTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${API_BASE_URL}/health`, {
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
    const scheduleDebouncedHealthCheck = () => {
      if (scheduledTimeoutRef.current) {
        clearTimeout(scheduledTimeoutRef.current);
      }
      scheduledTimeoutRef.current = setTimeout(() => {
        checkHealth();
      }, HEALTH_CHECK_DEBOUNCE_MS);
    };

    // AI-SUGGESTION: Keep the initial quick check so the UI can show status without waiting 60s.
    checkHealth();
    scheduleDebouncedHealthCheck();

    // AI-SUGGESTION: Reset the countdown on user activity.
    const activityEvents: Array<keyof WindowEventMap> = [
      'click',
      'keydown',
      'mousedown',
      'mousemove',
      'scroll',
      'touchstart',
    ];

    const onUserActivity = () => {
      scheduleDebouncedHealthCheck();
    };

    for (const evt of activityEvents) {
      window.addEventListener(evt, onUserActivity, { passive: true });
    }

    // Cleanup on unmount / StrictMode re-mount
    return () => {
      if (scheduledTimeoutRef.current) {
        clearTimeout(scheduledTimeoutRef.current);
      }
      for (const evt of activityEvents) {
        window.removeEventListener(evt, onUserActivity);
      }
    };
  }, [checkHealth]);

  return healthStatus;
};

