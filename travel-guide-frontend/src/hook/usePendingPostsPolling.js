import { useEffect, useRef, useCallback } from 'react';
import api from '../services/article';

/**
 * Custom hook to poll pending posts and update their status
 * * @param {Array} posts - Array of posts to monitor
 * @param {Function} onStatusChange - Callback when a post status changes
 * @param {Object} options - Polling options
 * @returns {Object} - Polling state and controls
 */
export function usePendingPostsPolling(posts, onStatusChange, options = {}) {
  const {
    interval = 20000,      // Poll every 20 seconds
    maxDuration = 120000,  // Stop after 120 seconds
    enabled = true        // Enable/disable polling
  } = options;

  const pollTimerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pollingPostsRef = useRef(new Set());
  const pollCountRef = useRef(0);  // Track number of polls
  
  // Track posts that have been notified - persist to localStorage with timestamp
  // Initialize with IIFE to load from localStorage
  const getInitialNotifiedPosts = () => {
    try {
      const stored = localStorage.getItem('notifiedPosts');
      const timestamp = localStorage.getItem('notifiedPostsTimestamp');
      
      if (stored && timestamp) {
        const age = Date.now() - parseInt(timestamp, 10);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        // Clear if older than 24 hours
        if (age > maxAge) {
          console.log('🗑️ Notified posts cache expired (>24h), clearing...');
          localStorage.removeItem('notifiedPosts');
          localStorage.removeItem('notifiedPostsTimestamp');
          return new Set();
        }
        
        const parsed = JSON.parse(stored);
        console.log('📦 Loaded notified posts from localStorage:', parsed.length, 'items');
        return new Set(parsed);
      }
    } catch (e) {
      console.error('Failed to load notified posts from localStorage:', e);
    }
    return new Set();
  };
  
  const notifiedPostsRef = useRef(getInitialNotifiedPosts());

  // Save notified posts to localStorage whenever it changes
  const saveNotifiedPosts = useCallback(() => {
    try {
      const array = Array.from(notifiedPostsRef.current);
      localStorage.setItem('notifiedPosts', JSON.stringify(array));
      localStorage.setItem('notifiedPostsTimestamp', Date.now().toString());
      console.log('💾 Saved notified posts to localStorage:', array.length, 'items');
    } catch (e) {
      console.error('Failed to save notified posts to localStorage:', e);
    }
  }, []);

  // Find pending posts that need polling
  const getPendingPosts = useCallback(() => {
    if (!posts || !Array.isArray(posts)) return [];
    
    return posts.filter(post => 
      post.status === 'pending' && 
      post.articleId &&
      !pollingPostsRef.current.has(post.articleId)
    );
  }, [posts]);

  // Poll a single post
  const pollPost = useCallback(async (articleId) => {
    try {
      console.log(`🔄 Polling post ${articleId}...`);
      
      // Use listArticlesNoCache to get fresh data
      // This is more reliable than getArticle for status updates
      const response = await api.listArticlesNoCache({ 
        scope: 'mine',  // Get user's own posts
        limit: 50       // Get enough posts to find the one we're looking for
      });
      
      if (!response || !response.items) {
        console.log(`⚠️ No response from API`);
        return null;
      }

      // Find the post we're polling
      const updatedPost = response.items.find(p => p.articleId === articleId);
      
      if (!updatedPost) {
        console.log(`⚠️ Post ${articleId} not found in response`);
        // Don't remove from polling yet, might be temporary issue
        return null;
      }

      console.log(`📊 Post ${articleId} current status: ${updatedPost.status}`);

      // Check if status changed from pending
      if (updatedPost.status !== 'pending') {
        console.log(`✅ Post ${articleId} status changed: ${updatedPost.status}`);
        
        // Remove from polling set
        pollingPostsRef.current.delete(articleId);
        
        // Create unique notification key (articleId + status)
        // This prevents duplicate notifications even if status changes multiple times
        const notificationKey = `${articleId}:${updatedPost.status}`;
        
        // Only notify if we haven't notified this exact status change yet
        if (!notifiedPostsRef.current.has(notificationKey)) {
          console.log(`📢 Notifying parent about status change for ${articleId} (${updatedPost.status})`);
          notifiedPostsRef.current.add(notificationKey);
          
          // Also add articleId alone to prevent any future notifications for this post
          notifiedPostsRef.current.add(articleId);
          
          // Save to localStorage
          saveNotifiedPosts();
          
          // Notify parent component
          if (onStatusChange) {
            onStatusChange(updatedPost);
          }
        } else {
          console.log(`⏭️ Already notified about ${articleId}:${updatedPost.status}, skipping`);
        }
        
        return updatedPost;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error polling post ${articleId}:`, error);
      // Don't remove from polling on error, will retry
      return null;
    }
  }, [onStatusChange, saveNotifiedPosts]); // Thêm saveNotifiedPosts vào dependency

  // Poll all pending posts
  const pollAllPending = useCallback(async () => {
    const pendingPosts = getPendingPosts();
    
    if (pendingPosts.length === 0 && pollingPostsRef.current.size === 0) {
      console.log('📭 No pending posts to poll');
      return;
    }

    pollCountRef.current += 1;
    const pollNumber = pollCountRef.current;
    
    console.log(`🔄 Poll #${pollNumber}: Checking ${pendingPosts.length} pending posts + ${pollingPostsRef.current.size} tracked posts...`);

    // Add new pending posts to polling set
    pendingPosts.forEach(post => {
      if (!pollingPostsRef.current.has(post.articleId)) {
        console.log(`  ➕ Adding ${post.articleId} to polling`);
        pollingPostsRef.current.add(post.articleId);
      }
    });

    // Poll all tracked posts (not just new ones)
    const postsToCheck = Array.from(pollingPostsRef.current);
    
    if (postsToCheck.length === 0) {
      console.log('  📭 No posts to check');
      return;
    }

    // Poll all posts (use single API call for efficiency)
    const results = await Promise.allSettled(
      postsToCheck.map(articleId => pollPost(articleId))
    );

    // Count successful updates
    const updated = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    if (updated > 0) {
      console.log(`✅ Poll #${pollNumber}: Updated ${updated} posts`);
    } else {
      console.log(`⏳ Poll #${pollNumber}: No updates yet (${pollingPostsRef.current.size} still pending)`);
    }
  }, [getPendingPosts, pollPost]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollingPostsRef.current.clear();
    // Don't clear notifiedPostsRef - keep track of notified posts across polling sessions
    console.log('🛑 Stopped pending posts polling');
  }, []);

  // Start polling
  const startPolling = useCallback(() => {
    if (!enabled) {
      console.log('⏸️ Polling disabled');
      return;
    }

    // Don't start if already polling
    if (pollTimerRef.current) {
      console.log('⏸️ Already polling');
      return;
    }

    // Record start time
    startTimeRef.current = Date.now();
    pollCountRef.current = 0;

    console.log('🚀 Starting pending posts polling...');
    console.log(`  ⏱️ Interval: ${interval}ms`);
    console.log(`  ⏱️ Max duration: ${maxDuration}ms`);

    // Initial poll (immediate)
    pollAllPending();

    // Set up interval
    pollTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;

      // Stop if max duration exceeded
      if (elapsed > maxDuration) {
        console.log(`⏱️ Polling timeout reached (${elapsed}ms), stopping...`);
        stopPolling();
        return;
      }

      // Stop if no more pending posts
      const pendingPosts = getPendingPosts();
      if (pendingPosts.length === 0 && pollingPostsRef.current.size === 0) {
        console.log('✅ No more pending posts, stopping polling');
        stopPolling();
        return;
      }

      pollAllPending();
    }, interval);
  }, [enabled, interval, maxDuration, pollAllPending, getPendingPosts, stopPolling]);
  
  // Clear notified posts (useful for testing or cleanup)
  const clearNotifiedPosts = useCallback(() => {
    notifiedPostsRef.current.clear();
    localStorage.removeItem('notifiedPosts');
    localStorage.removeItem('notifiedPostsTimestamp'); // Nên xóa cả timestamp
    console.log('🗑️ Cleared notified posts');
  }, []);

  // Auto-start polling when posts change
  useEffect(() => {
    if (!enabled) return;

    const pendingPosts = getPendingPosts();
    
    if (pendingPosts.length > 0 && !pollTimerRef.current) {
      startPolling();
    }

    // Cleanup ONLY on unmount (not on posts change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, enabled]);
  
  // Separate cleanup effect for unmount only
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    startPolling,
    stopPolling,
    clearNotifiedPosts,
    isPolling: !!pollTimerRef.current
  };
}