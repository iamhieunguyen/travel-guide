# Design Document: Infinite Scroll + New Posts Notification

## Overview

This feature implements infinite scroll pagination combined with smart polling for new posts detection. The design prioritizes simplicity, performance, and user experience while working within existing infrastructure constraints.

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        HomePage                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  New Posts Banner (conditional)                     │    │
│  │  "3 bài mới - Click để xem"                        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Post 1                                             │    │
│  │  Post 2                                             │    │
│  │  Post 3                                             │    │
│  │  ...                                                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Sentinel Element (Intersection Observer)          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Loading Indicator / End of Feed                   │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

         ↓ Scroll to bottom          ↓ Every 30s (if active)
         
    Load More Posts              Check for New Posts
         ↓                              ↓
    Backend API                   Backend API
    (limit=3)                     (limit=1, latest)
```

## Components and Interfaces

### 1. useInfiniteScroll Hook

**Purpose:** Manage infinite scroll logic with Intersection Observer

**Interface:**
```typescript
interface UseInfiniteScrollProps {
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

interface UseInfiniteScrollReturn {
  sentinelRef: RefObject<HTMLDivElement>;
}
```

**Behavior:**
- Observes sentinel element at bottom of feed
- Triggers `loadMore()` when sentinel is 50% visible
- Prevents duplicate calls when already loading
- Cleans up observer on unmount

### 2. useNewPostsPolling Hook

**Purpose:** Smart polling for new posts detection

**Interface:**
```typescript
interface UseNewPostsPollingProps {
  enabled: boolean;
  interval: number; // milliseconds
  checkNewPosts: () => Promise<number>; // returns count
}

interface UseNewPostsPollingReturn {
  newPostsCount: number;
  resetNewPosts: () => void;
}
```

**Behavior:**
- Polls only when tab is active (Page Visibility API)
- Pauses when tab is hidden
- Immediate check when tab becomes visible again
- Exponential backoff on errors

### 3. NewPostsBanner Component

**Purpose:** Display notification for new posts

**Props:**
```typescript
interface NewPostsBannerProps {
  count: number;
  onLoadNew: () => void;
}
```

**UI:**
```jsx
<div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
  <button 
    onClick={onLoadNew}
    className="bg-[#92ADA4] text-white px-6 py-3 rounded-full shadow-lg"
  >
    <ArrowUp className="w-4 h-4 inline mr-2" />
    {count} bài mới
  </button>
</div>
```

### 4. Backend API (No Changes Needed)

**Existing Endpoints:**
- `GET /articles?limit=3&nextToken=xxx` - Pagination
- `GET /articles?limit=1` - Get latest post for comparison

## Data Models

### Frontend State

```typescript
interface HomePageState {
  // Posts
  posts: Article[];
  nextToken: string | null;
  
  // Loading states
  loading: boolean;
  loadingMore: boolean;
  
  // New posts
  newPostsCount: number;
  latestPostId: string | null;
  
  // Error handling
  error: string | null;
  retryCount: number;
}
```

### Article Model (Unchanged)

```typescript
interface Article {
  articleId: string;
  title: string;
  content: string;
  createdAt: string; // ISO timestamp
  lat: number;
  lng: number;
  imageKeys?: string[];
  favoriteCount: number;
  // ... other fields
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Infinite scroll triggers at correct threshold
*For any* scroll position, when the sentinel element is 50% visible in viewport, the system should trigger loadMore() exactly once until loading completes
**Validates: Requirements 1.1**

### Property 2: No duplicate posts in feed
*For any* sequence of load operations, the posts array should never contain duplicate articleIds
**Validates: Requirements 1.4, 6.1**

### Property 3: Polling pauses when tab inactive
*For any* tab visibility state, when the tab is hidden, no polling requests should be made
**Validates: Requirements 2.2, 4.5**

### Property 4: New posts count accuracy
*For any* polling result, the newPostsCount should equal the number of posts with createdAt > latestPostId.createdAt
**Validates: Requirements 2.4, 3.2**

### Property 5: Banner appears only when new posts exist
*For any* state, the new posts banner should be visible if and only if newPostsCount > 0
**Validates: Requirements 3.1**

### Property 6: Load new posts prepends correctly
*For any* existing posts array, loading new posts should prepend them in reverse chronological order without duplicates
**Validates: Requirements 6.3**

### Property 7: Exponential backoff on errors
*For any* sequence of failed requests, the retry delay should increase exponentially: 1s, 2s, 4s, 8s, max 30s
**Validates: Requirements 5.1**

### Property 8: Scroll position maintained during load
*For any* infinite scroll load, the user's scroll position should remain stable (no jump)
**Validates: Requirements 4.2**

## Error Handling

### Error Scenarios

1. **Network Error During Polling**
   - Retry with exponential backoff: 1s → 2s → 4s → 8s → 30s
   - After 3 failures: pause polling, show banner "Mất kết nối"
   - Resume on user action or successful request

2. **Load More Fails**
   - Show inline error message
   - Display "Thử lại" button
   - Maintain current posts (don't clear)

3. **New Posts Load Fails**
   - Show toast notification
   - Keep banner visible
   - Allow retry

4. **Rate Limiting (429)**
   - Increase polling interval to 60s
   - Show warning toast
   - Resume normal interval after 5 minutes

### Error UI Components

```jsx
// Inline error for load more
<div className="text-center py-4">
  <p className="text-red-600 mb-2">Không thể tải thêm bài viết</p>
  <button onClick={retry}>Thử lại</button>
</div>

// Toast for polling errors
<Toast type="warning">
  Mất kết nối. Đang thử kết nối lại...
</Toast>
```

## Testing Strategy

### Unit Tests

1. **useInfiniteScroll Hook**
   - Test observer triggers at correct threshold
   - Test prevents duplicate calls
   - Test cleanup on unmount

2. **useNewPostsPolling Hook**
   - Test polling interval
   - Test pause on tab hidden
   - Test immediate check on tab visible
   - Test exponential backoff

3. **NewPostsBanner Component**
   - Test renders with correct count
   - Test onClick handler
   - Test animation

### Integration Tests

1. **Full Infinite Scroll Flow**
   - Load initial posts
   - Scroll to bottom
   - Verify new posts loaded
   - Verify no duplicates

2. **New Posts Detection Flow**
   - Wait for polling interval
   - Create new post (mock)
   - Verify banner appears
   - Click banner
   - Verify new posts loaded

### Property-Based Tests

1. **No Duplicate Posts Property**
   - Generate random sequences of load operations
   - Verify posts array never has duplicate IDs

2. **Polling Pause Property**
   - Generate random tab visibility changes
   - Verify no requests when hidden

## Performance Considerations

### Optimizations

1. **Debounced Scroll Events**
   ```javascript
   const debouncedScroll = useMemo(
     () => debounce(handleScroll, 100),
     []
   );
   ```

2. **Request Deduplication**
   ```javascript
   const loadMoreRef = useRef(false);
   if (loadMoreRef.current) return;
   loadMoreRef.current = true;
   ```

3. **Conditional Polling**
   ```javascript
   const shouldPoll = isTabActive && !isLoading && posts.length > 0;
   ```

4. **Memoized Components**
   ```javascript
   const PostCard = memo(({ post }) => { ... });
   ```

### Metrics to Monitor

- Time to first render (target: < 2s)
- Infinite scroll load time (target: < 1s)
- Polling request count (target: < 150/hour/user)
- Memory usage (target: < 50MB for 100 posts)

## Implementation Notes

### Phase 1: Infinite Scroll (Core)
1. Reduce initial limit to 3
2. Implement useInfiniteScroll hook
3. Add sentinel element
4. Test scroll behavior

### Phase 2: New Posts Detection
1. Implement useNewPostsPolling hook
2. Add Page Visibility API integration
3. Implement checkNewPosts logic
4. Test polling behavior

### Phase 3: UI Polish
1. Create NewPostsBanner component
2. Add animations
3. Implement smooth scroll to top
4. Add loading states

### Phase 4: Error Handling
1. Add exponential backoff
2. Implement retry logic
3. Add error UI components
4. Test error scenarios

## Security Considerations

1. **Rate Limiting**: Respect backend rate limits
2. **Token Validation**: Ensure auth token is valid before polling
3. **XSS Prevention**: Sanitize post content before rendering
4. **CSRF Protection**: Use existing CORS configuration

## Deployment Strategy

1. **Feature Flag**: Deploy behind feature flag initially
2. **Gradual Rollout**: Enable for 10% → 50% → 100% users
3. **Monitoring**: Watch error rates and performance metrics
4. **Rollback Plan**: Disable feature flag if issues arise

## Future Enhancements

1. **WebSocket Support**: Upgrade to WebSocket for true realtime
2. **Virtual Scrolling**: Implement windowing for 1000+ posts
3. **Offline Support**: Cache posts for offline viewing
4. **Push Notifications**: Browser notifications for new posts
