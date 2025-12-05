// hooks/useInfiniteScroll.js
import { useEffect, useRef } from 'react';

/**
 * Custom hook for infinite scroll using Intersection Observer
 * @param {Function} loadMore - Callback to load more items
 * @param {boolean} hasMore - Whether there are more items to load
 * @param {boolean} isLoading - Whether currently loading
 * @returns {Object} - { sentinelRef } - Ref to attach to sentinel element
 */
export function useInfiniteScroll({ loadMore, hasMore, isLoading }) {
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    // Don't set up observer if no more items or currently loading
    if (!hasMore || isLoading) {
      return;
    }

    // Create Intersection Observer
    const options = {
      root: null, // viewport
      rootMargin: '200px', // Trigger 200px before reaching sentinel
      threshold: 0.1, // Trigger when 10% visible
    };

    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries;
      
      // If sentinel is intersecting and we're not loading, load more
      if (entry.isIntersecting && hasMore && !isLoading) {
        console.log('🔄 Infinite scroll triggered');
        loadMore();
      }
    }, options);

    // Start observing the sentinel element
    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observerRef.current.observe(currentSentinel);
    }

    // Cleanup
    return () => {
      if (observerRef.current && currentSentinel) {
        observerRef.current.unobserve(currentSentinel);
      }
    };
  }, [loadMore, hasMore, isLoading]);

  return { sentinelRef };
}
