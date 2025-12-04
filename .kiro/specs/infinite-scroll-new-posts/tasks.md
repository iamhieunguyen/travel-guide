# Implementation Plan: Infinite Scroll + New Posts Notification

## Phase 1: Setup and Initial Changes

- [ ] 1. Update initial load limit
  - Change `limit: 10` to `limit: 3` in HomePage.jsx loadPosts function
  - Update search limit to `limit: 3` as well
  - Test that initial load shows only 3 posts
  - _Requirements: 1.5_

## Phase 2: Infinite Scroll Implementation

- [ ] 2. Create useInfiniteScroll custom hook
  - Create new file `src/hooks/useInfiniteScroll.js`
  - Implement Intersection Observer logic
  - Add threshold configuration (50% visibility)
  - Add cleanup on unmount
  - _Requirements: 1.1, 1.4_

- [ ] 3. Add sentinel element to HomePage
  - Add invisible div at bottom of posts list
  - Connect to useInfiniteScroll hook
  - Add loading indicator below sentinel
  - Add "End of feed" message when no more posts
  - _Requirements: 1.2, 1.3_

- [ ] 4. Update loadMore logic
  - Remove manual "Load More" button
  - Ensure loadMore prevents duplicate calls
  - Add proper loading states
  - Test scroll-triggered loading
  - _Requirements: 1.1, 1.4_

## Phase 3: New Posts Detection

- [ ] 5. Create useNewPostsPolling custom hook
  - Create new file `src/hooks/useNewPostsPolling.js`
  - Implement polling with setInterval
  - Add Page Visibility API integration
  - Implement pause/resume on tab visibility change
  - Add immediate check when tab becomes visible
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 6. Implement checkNewPosts function
  - Add API call to get latest post (limit=1)
  - Compare with current first post's createdAt
  - Return count of new posts
  - Handle errors gracefully
  - _Requirements: 2.4_

- [ ] 7. Integrate polling into HomePage
  - Add useNewPostsPolling hook to HomePage
  - Store newPostsCount in state
  - Store latestPostId for comparison
  - Test polling behavior
  - _Requirements: 2.1, 2.4_

## Phase 4: New Posts Banner UI

- [ ] 8. Create NewPostsBanner component
  - Create new file `src/components/NewPostsBanner.jsx`
  - Implement banner UI with count display
  - Add click handler prop
  - Add slide-down animation
  - Style with Tailwind CSS
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 9. Implement loadNewPosts function
  - Add function to load posts newer than latestPostId
  - Prepend new posts to existing array
  - Remove duplicates
  - Reset newPostsCount to 0
  - Hide banner after loading
  - _Requirements: 3.4, 6.3_

- [ ] 10. Add smooth scroll to top
  - Implement smooth scroll behavior on banner click
  - Ensure scroll completes before loading new posts
  - Test on different screen sizes
  - _Requirements: 3.3_

## Phase 5: Performance Optimization

- [ ] 11. Add scroll event debouncing
  - Implement debounce utility or use lodash
  - Apply to scroll event handlers
  - Test that it reduces excessive calls
  - _Requirements: 4.4_

- [ ] 12. Implement request deduplication
  - Add loading flags to prevent duplicate API calls
  - Use refs to track in-flight requests
  - Test rapid scroll scenarios
  - _Requirements: 1.4, 4.2_

- [ ] 13. Optimize component rendering
  - Memoize PostCard components
  - Use React.memo for expensive components
  - Test rendering performance with DevTools
  - _Requirements: 4.2_

- [ ] 14. Add conditional polling logic
  - Only poll when tab is active
  - Only poll when not already loading
  - Only poll when posts exist
  - _Requirements: 2.2, 4.5_

## Phase 6: Error Handling

- [ ] 15. Implement exponential backoff
  - Add retry logic with increasing delays (1s, 2s, 4s, 8s, 30s)
  - Track consecutive failure count
  - Reset on successful request
  - _Requirements: 5.1_

- [ ] 16. Add error UI for load more failures
  - Display inline error message
  - Add "Retry" button
  - Maintain existing posts on error
  - Test error scenarios
  - _Requirements: 5.2_

- [ ] 17. Add error handling for polling
  - Show toast notification on polling errors
  - Pause polling after 3 consecutive failures
  - Add manual retry option
  - Resume on successful request
  - _Requirements: 5.4, 5.5_

- [ ] 18. Handle rate limiting (429 errors)
  - Detect 429 status code
  - Increase polling interval to 60s
  - Show warning toast to user
  - Resume normal interval after 5 minutes
  - _Requirements: 5.1_

## Phase 7: State Management

- [ ] 19. Refactor state management
  - Ensure single source of truth for posts array
  - Store pending new posts separately
  - Update all dependent UI on state changes
  - Add proper TypeScript types (if using TS)
  - _Requirements: 6.1, 6.2, 6.4_

- [ ] 20. Add cleanup on unmount
  - Clear all intervals
  - Disconnect Intersection Observer
  - Remove event listeners
  - Test for memory leaks
  - _Requirements: 6.5_

## Phase 8: Accessibility

- [ ] 21. Add ARIA announcements
  - Announce new posts count to screen readers
  - Announce loading states
  - Announce end of feed
  - Test with screen reader
  - _Requirements: 7.1, 7.3, 7.4_

- [ ] 22. Ensure keyboard accessibility
  - Make banner keyboard accessible (tab + enter)
  - Maintain focus management
  - Test keyboard navigation
  - _Requirements: 7.2, 7.5_

## Phase 9: Testing and Polish

- [ ] 23. Manual testing
  - Test infinite scroll on desktop
  - Test infinite scroll on mobile
  - Test new posts detection
  - Test banner click behavior
  - Test error scenarios
  - Test with slow network (throttling)

- [ ] 24. Cross-browser testing
  - Test on Chrome
  - Test on Firefox
  - Test on Safari
  - Test on Edge
  - Fix any browser-specific issues

- [ ] 25. Performance testing
  - Measure initial load time (target < 2s)
  - Measure infinite scroll load time (target < 1s)
  - Check memory usage with 100+ posts
  - Verify smooth 60fps scrolling

- [ ] 26. Final polish
  - Adjust animations timing
  - Fine-tune polling interval if needed
  - Improve loading indicators
  - Add any missing visual feedback

## Phase 10: Deployment

- [ ] 27. Code review and cleanup
  - Remove console.logs
  - Add code comments
  - Ensure consistent code style
  - Update documentation

- [ ] 28. Deploy to production
  - Build frontend
  - Deploy to S3/CloudFront
  - Monitor error rates
  - Monitor performance metrics

- [ ] 29. Post-deployment monitoring
  - Watch CloudWatch logs
  - Monitor API request counts
  - Check user feedback
  - Be ready to rollback if issues arise

## Notes

- Each task should be completed and tested before moving to the next
- Focus on core functionality first (Phases 1-4), then optimize (Phases 5-6)
- Accessibility and testing (Phases 7-9) can be done in parallel with optimization
- Keep the implementation simple and maintainable
- Test frequently to catch issues early
