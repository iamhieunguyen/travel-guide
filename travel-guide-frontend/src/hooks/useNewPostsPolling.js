// hooks/useNewPostsPolling.js
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for smart polling with Page Visibility API
 * @param {Function} checkNewPosts - Async function that returns count of new posts
 * @param {number} interval - Polling interval in milliseconds (default: 30000)
 * @param {boolean} enabled - Whether polling is enabled
 * @returns {Object} - { newPostsCount, resetNewPosts }
 */
export function useNewPostsPolling({ checkNewPosts, interval = 10000, enabled = true }) {
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [isTabActive, setIsTabActive] = useState(!document.hidden);
  const intervalRef = useRef(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Reset new posts count
  const resetNewPosts = useCallback(() => {
    setNewPostsCount(0);
    retryCount.current = 0;
  }, []);

  // Perform the check for new posts
  const performCheck = useCallback(async () => {
    if (!enabled) return;

    try {
      console.log('🔍 Checking for new posts...');
      const count = await checkNewPosts();
      
      if (count > 0) {
        console.log(`✨ Found ${count} new posts`);
        setNewPostsCount(count);
      }
      
      // Reset retry count on success
      retryCount.current = 0;
    } catch (error) {
      console.error('❌ Error checking new posts:', error);
      retryCount.current += 1;
      
      // Stop polling after max retries
      if (retryCount.current >= maxRetries) {
        console.warn('⚠️ Max retries reached, pausing polling');
        // Could show a toast notification here
      }
    }
  }, [checkNewPosts, enabled]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isActive = !document.hidden;
      setIsTabActive(isActive);
      
      // When tab becomes active, check immediately
      if (isActive && enabled) {
        console.log('👁️ Tab became active, checking for new posts...');
        performCheck();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, performCheck]);

  // Set up polling interval
  useEffect(() => {
    // Only poll if enabled, tab is active, and haven't exceeded retries
    if (!enabled || !isTabActive || retryCount.current >= maxRetries) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial check
    performCheck();

    // Set up interval
    intervalRef.current = setInterval(() => {
      performCheck();
    }, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isTabActive, interval, performCheck]);

  return {
    newPostsCount,
    resetNewPosts,
  };
}
