// pages/HomePage.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCreatePostModal } from '../context/CreatePostModalContext';
import api from '../services/article';
import { Heart, MapPin, Clock, Share2, ChevronLeft, ChevronRight, Sun, Moon, Globe, ArrowRight } from 'lucide-react';
import ChristmasEffects from '../components/ChristmasEffects';
import PostMap from '../components/PostMap';
import useProfile from '../hook/useProfile';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useInfiniteScroll } from '../hook/useInfiniteScroll';
import { useNewPostsPolling } from '../hook/useNewPostsPolling';
import { usePendingPostsPolling } from '../hook/usePendingPostsPolling';
import NewPostsBanner from '../components/NewPostsBanner';
import './HomePage.css';

// Component carousel để lướt qua nhiều ảnh
function PostImageCarousel({ images, postTitle }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!images || images.length === 0) return null;
  
  const getImageUrl = (imageKey) => {
    return imageKey.startsWith('http') 
      ? imageKey
      : `https://${process.env.REACT_APP_CF_DOMAIN}/${imageKey}`;
  };
  
  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };
  
  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };
  
  return (
    <div className="relative rounded-3xl overflow-hidden bg-gray-100" style={{ height: '550px' }}>
      <img
        src={getImageUrl(images[currentIndex])}
        alt={`${postTitle} - ${currentIndex + 1}`}
        className="w-full h-full object-contain"
        onError={(e) => {
          e.target.src = 'https://placehold.co/600x600/e2e8f0/64748b?text=No+Image';
        }}
      />
      
      {images.length > 1 && (
        <>
          {/* Navigation buttons */}
          <button
            onClick={prevImage}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full transition shadow-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full transition shadow-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-white w-6' 
                    : 'bg-white/50 hover:bg-white/75 w-2'
                }`}
              />
            ))}
          </div>
          
          {/* Counter */}
          <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user, logout, authChecked } = useAuth();
  const { openModal, openEditModal } = useCreatePostModal();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { language, setLanguage } = useLanguage();
  const { themeMode, setThemeMode, isDarkMode } = useTheme();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextToken, setNextToken] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // HomePage always shows public feed (approved posts from everyone)
  // Owner can still see their own pending/rejected posts mixed in
  const scope = 'public';
  const [openMenuId, setOpenMenuId] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // Khởi tạo với string rỗng thay vì undefined
  const [likedPosts, setLikedPosts] = useState(new Set()); // Track liked posts
  const [hiddenPostIds, setHiddenPostIds] = useState(new Set()); // Track hidden posts
  const [tagFilter, setTagFilter] = useState(''); // Tag filter state
  const [hoveredLocation, setHoveredLocation] = useState(null); // Track hovered location for tooltip
  const searchInputRef = useRef(null); // Ref for search input
  const mapType = user?.mapTypePref || 'roadmap';
  
  // Hide tooltip on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (hoveredLocation) {
        setHoveredLocation(null);
      }
    };
    
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [hoveredLocation]);

  const TEXT = {
    vi: {
      hello: 'Hello,',
      home: 'Trang chủ',
      search: 'Tìm kiếm',
      favorite: 'Yêu thích',
      create: 'Tạo',
      personal: 'Trang cá nhân',
      logout: 'Đăng xuất',
      searchPlaceholder: 'Tìm kiếm theo vị trí, mô tả',
      loadingMore: 'Đang tải...',
      loadMore: 'Tải thêm',
      noPostsTitle: 'Chưa có bài viết nào',
      noPostsDesc: 'Hãy tạo bài viết đầu tiên của bạn!',
      createFirstPost: 'Tạo bài viết mới',
      likeCount: 'lượt quan tâm',
      like: 'Quan tâm bài đăng',
      liked: 'Đã quan tâm',
      darkMode: 'Chế độ tối',
      lightMode: 'Chế độ sáng',
      languageToggle: 'Ngôn ngữ',
      trendingTags: 'Trending Tags',
      filteringByTag: 'Đang lọc theo tag',
      clearFilter: 'Xóa bộ lọc',
      searchResultsFor: 'Kết quả tìm kiếm cho',
      clearSearch: 'Xóa tìm kiếm',
      searchingWithTag: 'Đang tìm bài viết với tag',
      searching: 'Đang tìm kiếm',
      loadingMorePosts: 'Đang tải thêm bài viết...',
      endOfFeed: 'Bạn đã xem hết tất cả bài viết',
      edit: 'Chỉnh sửa',
      delete: 'Xóa',
      hidePost: 'Ẩn bài viết',
      deleteConfirm: 'Bạn có chắc chắn muốn xóa bài viết này?',
      deleteSuccess: 'Xóa bài viết thành công!',
      deleteError: 'Lỗi khi xóa bài viết',
      unlikeSuccess: 'Đã bỏ quan tâm bài viết',
      likeSuccess: 'Đã quan tâm bài viết',
      apiNotFound: 'API endpoint không tồn tại. Vui lòng deploy backend.',
      loginRequired: 'Bạn cần đăng nhập để thực hiện thao tác này',
    },
    en: {
      hello: 'Hello,',
      home: 'Home',
      search: 'Search',
      favorite: 'Favorites',
      create: 'Create',
      personal: 'Profile',
      logout: 'Logout',
      searchPlaceholder: 'Search by location, caption',
      loadingMore: 'Loading...',
      loadMore: 'Load more',
      noPostsTitle: 'No posts yet',
      noPostsDesc: 'Create your first post!',
      createFirstPost: 'Create new post',
      likeCount: 'likes',
      like: 'Like post',
      liked: 'Liked',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      languageToggle: 'Language',
      trendingTags: 'Trending Tags',
      filteringByTag: 'Filtering by tag',
      clearFilter: 'Clear filter',
      searchResultsFor: 'Search results for',
      clearSearch: 'Clear search',
      searchingWithTag: 'Searching posts with tag',
      searching: 'Searching',
      loadingMorePosts: 'Loading more posts...',
      endOfFeed: 'You\'ve seen all posts',
      edit: 'Edit',
      delete: 'Delete',
      hidePost: 'Hide post',
      deleteConfirm: 'Are you sure you want to delete this post?',
      deleteSuccess: 'Post deleted successfully!',
      deleteError: 'Error deleting post',
      unlikeSuccess: 'Post unliked',
      likeSuccess: 'Post liked',
      apiNotFound: 'API endpoint not found. Please deploy backend.',
      loginRequired: 'You need to login to perform this action',
    },
  };

  const L = TEXT[language] || TEXT.vi;

  // New posts detection state - store the latest createdAt timestamp
  const [latestCreatedAt, setLatestCreatedAt] = useState(null);

  // Define loadPosts BEFORE any useEffect that uses it
  const loadPosts = useCallback(async (token = null, query = '', tag = '') => {
    try {
      if (!token) setLoading(true);
      else setLoadingMore(true);

      let response;
      if (tag && tag.trim()) {
        // Nếu có tag filter, dùng searchArticles với tags parameter
        console.log('🔍 Searching with tag:', tag.trim());
        response = await api.searchArticles({
          tags: tag.trim(),
          scope: scope,
          limit: 50,  // Increased limit for better search results with filters
          nextToken: token
        });
        console.log('📦 Tag search response:', response);
      } else if (query && query.trim()) {
        // Nếu có search query, dùng searchArticles với q parameter
        console.log('🔍 Searching with query:', query.trim());
        response = await api.searchArticles({
          q: query.trim(),
          scope: scope,
          limit: 50,  // Increased limit for better search results with filters
          nextToken: token
        });
        console.log('📦 Query search response:', response);
      } else {
        // Nếu không có query hoặc tag, dùng listArticles bình thường
        response = await api.listArticles({
          scope: scope,
          limit: 20,  // Increased to handle filtering
          nextToken: token
        });
      }

      // Backend already has locationName, no need to fetch from Nominatim
      const posts = response.items;
      console.log('📊 Posts received:', posts.length, 'posts');
      if (tag && posts.length > 0) {
        console.log('🏷️ First post tags:', posts[0].tags, 'autoTags:', posts[0].autoTags);
      }

      if (token) {
        setPosts(prev => [...prev, ...posts]);
      } else {
        setPosts(posts);
        // Set latest createdAt timestamp for new posts detection
        if (posts.length > 0) {
          setLatestCreatedAt(posts[0].createdAt);
        }
      }
      setNextToken(response.nextToken);
    } catch (error) {
      console.error('Lỗi khi tải bài viết:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        stack: error.stack
      });
      
      // Display user-friendly error message
      if (window.showSuccessToast) {
        let errorMsg;
        if (error.status === 404) {
          errorMsg = language === 'vi' 
            ? 'API endpoint không tồn tại. Vui lòng deploy backend.'
            : 'API endpoint not found. Please deploy backend.';
        } else if (error.status === 500) {
          errorMsg = language === 'vi'
            ? 'Lỗi tìm kiếm. Vui lòng thử lại.'
            : 'Search failed. Please try again.';
        } else if (error.status === 400) {
          errorMsg = language === 'vi'
            ? 'Tham số tìm kiếm không hợp lệ.'
            : 'Invalid search parameters.';
        } else {
          errorMsg = language === 'vi'
            ? `Lỗi: ${error.message || 'Đã xảy ra lỗi'}`
            : `Error: ${error.message || 'An error occurred'}`;
        }
        window.showSuccessToast(errorMsg);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [scope]);
  
  // Read tag from URL on mount
  const [urlParamsLoaded, setUrlParamsLoaded] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tag = params.get('tag');
    const q = params.get('q');
    
    console.log('📍 Reading URL params - tag:', tag, 'q:', q);
    
    if (tag) {
      // Normalize tag to lowercase to match database format
      const normalizedTag = tag.toLowerCase();
      setTagFilter(normalizedTag);
      setSearchQuery(''); // Clear text search when filtering by tag
    } else if (q) {
      setSearchQuery(q);
      setTagFilter(''); // Clear tag filter when searching
    }
    
    setUrlParamsLoaded(true);
  }, []);

  // Sync URL changes (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tag = params.get('tag');
      const q = params.get('q');
      
      console.log('🔄 URL changed - tag:', tag, 'q:', q);
      
      if (tag) {
        setTagFilter(tag);
        setSearchQuery('');
        loadPosts(null, '', tag);
      } else if (q) {
        setSearchQuery(q);
        setTagFilter('');
        loadPosts(null, q, '');
      } else {
        setTagFilter('');
        setSearchQuery('');
        loadPosts(null, '', '');
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadPosts]);

  // Check for new posts
  const checkNewPosts = useCallback(async () => {
    if (!latestCreatedAt || posts.length === 0) {
      console.log('⚠️ Skip check: no latestCreatedAt or no posts');
      return 0;
    }
    
    try {
      const startTime = Date.now();
      console.log('🔍 Checking for new posts (no cache)...');
      console.log('📅 Current latestCreatedAt:', latestCreatedAt);
      
      // ✅ Use listArticlesNoCache to bypass cache for real-time updates
      const response = await api.listArticlesNoCache({
        scope: scope,
        limit: 20, // Check up to 20 posts
      });
      
      const endTime = Date.now();
      console.log(`⏱️ API call took: ${endTime - startTime}ms`);
      
      if (response.items && response.items.length > 0) {
        console.log(`📊 Received ${response.items.length} items from API`);
        console.log('📅 Latest item createdAt:', response.items[0].createdAt);
        
        // Count only posts with createdAt NEWER than our latest AND status="approved"
        // This ignores updated old posts and pending posts from others
        let count = 0;
        for (const post of response.items) {
          console.log(`  🔍 Post ${post.articleId}: ${post.createdAt} vs ${latestCreatedAt}, status=${post.status}`);
          
          if (post.createdAt > latestCreatedAt) {
            // Only count approved posts (or owner's own posts)
            const isOwn = user && post.ownerId === user.sub;
            const isApproved = post.status === 'approved' || !post.status; // Backward compat
            
            if (isApproved || isOwn) {
              count++;
              console.log(`    ✅ NEW (${post.createdAt} > ${latestCreatedAt}, approved or own)`);
            } else {
              console.log(`    ⏭️ SKIP (pending post from other user)`);
            }
          } else {
            console.log(`    ❌ OLD (${post.createdAt} <= ${latestCreatedAt})`);
            // Stop when we reach posts we've already seen
            break;
          }
        }
        
        if (count > 0) {
          console.log(`✨ Found ${count} new posts`);
        } else {
          console.log('ℹ️ No new posts found');
        }
        
        return count;
      } else {
        console.log('⚠️ No items in response');
      }
      
      return 0;
    } catch (error) {
      console.error('❌ Error checking new posts:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        stack: error.stack
      });
      return 0;
    }
  }, [latestCreatedAt, scope, posts.length, user]);

  // Use new posts polling hook
  const { newPostsCount, resetNewPosts } = useNewPostsPolling({
    checkNewPosts,
    interval: 10000, // 5 seconds (for testing - change back to 30000 for production)
    enabled: posts.length > 0 && !loading && !searchQuery, // Disable when searching
  });

  // Use pending posts polling hook to auto-update status
  usePendingPostsPolling(
    posts,
    (updatedPost) => {
      console.log('📝 Post status updated:', updatedPost.articleId, updatedPost.status);
      
      // Update post in state
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.articleId === updatedPost.articleId 
            ? { ...post, ...updatedPost }
            : post
        )
      );

      // Show success toast
      if (window.showSuccessToast) {
        const message = updatedPost.status === 'approved' 
          ? '✅ Bài viết đã được duyệt!'
          : updatedPost.status === 'rejected'
          ? '❌ Bài viết bị từ chối'
          : `📝 Trạng thái: ${updatedPost.status}`;
        window.showSuccessToast(message);
      }
    },
    {
      interval: 10000,      // Poll every 10 seconds (reduced frequency to save API calls)
      maxDuration: 200000,  // Stop after 180 seconds (3 minutes - enough for full pipeline)
      enabled: user && !loading  // Only poll when logged in
    }
  );

  // Use infinite scroll hook
  const { sentinelRef } = useInfiniteScroll({
    loadMore: () => {
      if (nextToken && !loadingMore) {
        loadPosts(nextToken, searchQuery, tagFilter);
      }
    },
    hasMore: !!nextToken,
    isLoading: loadingMore,
  });

  const handleSearch = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      console.log('🔍 Search triggered:', searchQuery);
      setTagFilter(''); // Clear tag filter when searching
      
      // Update URL with search query
      if (searchQuery.trim()) {
        window.history.pushState({}, '', `/home?q=${encodeURIComponent(searchQuery)}`);
      } else {
        window.history.pushState({}, '', '/home');
      }
      
      loadPosts(null, searchQuery, '');
    }
  };

  // Load new posts when banner is clicked
  const loadNewPosts = useCallback(async () => {
    try {
      // Smooth scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Wait a bit for scroll animation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // ✅ Invalidate cache to ensure fresh data
      console.log('🗑️ Invalidating articles cache...');
      api.invalidateArticlesCache();
      
      // Reset new posts count
      resetNewPosts();
      
      // Reload posts from beginning (will fetch fresh data)
      await loadPosts(null, searchQuery, tagFilter);
      
      console.log('✅ New posts loaded');
    } catch (error) {
      console.error('Error loading new posts:', error);
    }
  }, [resetNewPosts, loadPosts, searchQuery, tagFilter]);

  // Load user's favorite articles
  const loadFavorites = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('📥 Loading user favorites...');
      const response = await api.listFavoriteArticles({ limit: 100 });
      console.log('📦 Favorites response:', response);
      
      if (response && response.items) {
        const favoriteIds = new Set(response.items.map(item => item.articleId));
        setLikedPosts(favoriteIds);
        console.log('✅ Loaded favorites:', favoriteIds.size, 'articles', Array.from(favoriteIds));
      }
    } catch (error) {
      console.error('❌ Error loading favorites:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!authChecked || !urlParamsLoaded) return;
    if (scope === 'mine' && !user) {
      navigate('/auth');
      return;
    }
    // Only load on initial mount or when scope/auth changes
    // Tag and search changes are handled by their own handlers
    console.log('🚀 Initial load with tagFilter:', tagFilter, 'searchQuery:', searchQuery);
    loadPosts(null, searchQuery, tagFilter);
    loadFavorites(); // Load favorites when component mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, user, navigate, authChecked, urlParamsLoaded]); // Wait for URL params to be loaded, but don't re-run on tag/query changes

  const handleLike = async (postId) => {
    try {
      const isLiked = likedPosts.has(postId);
      
      console.log('🔄 Toggling like for post:', postId, 'Current state:', isLiked ? 'liked' : 'not liked');
      
      if (isLiked) {
        // Unfavorite
        console.log('📤 Calling unfavoriteArticle API...');
        const response = await api.unfavoriteArticle(postId);
        console.log('✅ Unfavorite response:', response);
        
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        
        // Update favoriteCount (backend tự động giảm)
        setPosts(prev => prev.map(post => 
          post.articleId === postId 
            ? { ...post, favoriteCount: Math.max(0, (post.favoriteCount || 0) - 1), likeCount: Math.max(0, (post.likeCount || post.favoriteCount || 0) - 1) }
            : post
        ));
        
        if (window.showSuccessToast) {
          window.showSuccessToast('Đã bỏ quan tâm bài viết');
        }
      } else {
        // Favorite
        console.log('📤 Calling favoriteArticle API...');
        const response = await api.favoriteArticle(postId);
        console.log('✅ Favorite response:', response);
        
        setLikedPosts(prev => new Set([...prev, postId]));
        
        // Update favoriteCount (backend tự động tăng)
        setPosts(prev => prev.map(post => 
          post.articleId === postId 
            ? { ...post, favoriteCount: (post.favoriteCount || 0) + 1, likeCount: (post.likeCount || post.favoriteCount || 0) + 1 }
            : post
        ));
        
        if (window.showSuccessToast) {
          window.showSuccessToast('Đã quan tâm bài viết');
        }
      }
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        stack: error.stack
      });
      
      if (window.showSuccessToast) {
        const errorMsg = error.status === 404 
          ? 'API endpoint không tồn tại. Vui lòng deploy backend.'
          : error.status === 401
          ? 'Bạn cần đăng nhập để thực hiện thao tác này'
          : `Lỗi: ${error.message}`;
        window.showSuccessToast(errorMsg);
      }
    }
  };

  const handleEditPost = (post) => {
    setOpenMenuId(null);
    openEditModal(post);
  };

  const handleDeletePost = async (postId) => {
    const confirmed = await window.showConfirmDialog('Bạn có chắc chắn muốn xóa bài viết này?');
    if (!confirmed) return;

    try {
      await api.deleteArticle(postId);
      api.clearCache();
      setPosts(prev => prev.filter(post => post.articleId !== postId));
      setOpenMenuId(null);
      if (window.showSuccessToast) {
        window.showSuccessToast('Xóa bài viết thành công!');
      }
    } catch (error) {
      if (window.showSuccessToast) {
        window.showSuccessToast('Lỗi khi xóa bài viết');
      }
    }
  };

  const toggleMenu = (postId) => {
    setOpenMenuId(openMenuId === postId ? null : postId);
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffMs = now - postDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (language === 'en') {
      if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      return 'Just now';
    }

    if (diffDays > 0) return `${diffDays} ngày trước`;
    if (diffHours > 0) return `${diffHours} giờ trước`;
    if (diffMinutes > 0) return `${diffMinutes} phút trước`;
    return 'Vừa xong';
  };

  // Handle tag click - filter posts by tag
  const handleTagClick = useCallback((tagName) => {
    console.log('🏷️ Tag clicked:', tagName);
    setSearchQuery(''); // Clear text search
    setTagFilter(tagName);
    window.history.pushState({}, '', `/home?tag=${encodeURIComponent(tagName)}`);
    loadPosts(null, '', tagName);
  }, [loadPosts]);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-[#000A14] via-[#01101E] via-[#011628] via-[#011C32] to-[#02182E]' : 'bg-gradient-to-br from-[#1E5A7A] via-[#2B7A9A] via-[#4A9BB8] via-[#6BBCD6] to-[#8DD8E8]'}`}>
      {/* Christmas Effects Overlay */}
      <ChristmasEffects />
      
      {/* Fixed Location Tooltip */}
      {hoveredLocation && (
        <div 
          className="fixed bg-gray-800 text-white text-sm rounded-lg px-3 py-2 shadow-2xl pointer-events-none" 
          style={{ 
            zIndex: 999999, 
            maxWidth: '400px',
            left: `${hoveredLocation.x}px`,
            top: `${hoveredLocation.y}px`
          }}
        >
          <div className="absolute -top-1 left-3 w-2 h-2 bg-gray-800 transform rotate-45"></div>
          {hoveredLocation.text}
        </div>
      )}
      
      <div className="flex p-3 h-screen overflow-hidden">
        {/* Left Sidebar - Icon only with hover expand - Fixed to left edge */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="fixed left-3 top-24 bottom-6 w-64 px-4 flex flex-col rounded-3xl">
              {/* Logo/Title */}
              <div className="mb-6 px-3">
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-[#F5E6D3]' : 'text-white'}`}>
                  TRAVEL <span className={isDarkMode ? 'text-[#F5E6D3]/90' : 'text-white/90'}>JOURNAL</span>
                </h1>
              </div>

              {/* Navigation Items with Text */}
              <div className="space-y-1">
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setTagFilter('');
                    window.history.replaceState({}, '', '/home');
                    loadPosts(null, '', '');
                  }}
                  className={`sidebar-nav-button w-full flex items-center space-x-4 p-3 ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
                >
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.005 16.545a2.997 2.997 0 012.997-2.997h0A2.997 2.997 0 0115 16.545V22h7V11.543L12 2 2 11.543V22h7.005z"/>
                  </svg>
                  <span className="font-medium text-base">{L.home}</span>
                </button>

                <button 
                  onClick={() => searchInputRef.current?.focus()}
                  className={`sidebar-nav-button w-full flex items-center space-x-4 p-3 ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <span className="font-medium text-base">{L.search}</span>
                </button>

                <button 
                  onClick={() => navigate('/personal?tab=favorites')}
                  className={`sidebar-nav-button w-full flex items-center space-x-4 p-3 ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                  </svg>
                  <span className="font-medium text-base">{L.favorite}</span>
                </button>

                <button 
                  onClick={openModal}
                  className={`sidebar-nav-button w-full flex items-center space-x-4 p-3 ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  <span className="font-medium text-base">{L.create}</span>
                </button>

                <button 
                  onClick={() => navigate('/gallery')}
                  className={`sidebar-nav-button w-full flex items-center space-x-4 p-3 ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="font-medium text-base">{L.trendingTags}</span>
                </button>

                <button 
                  onClick={() => navigate('/personal')}
                  className={`sidebar-nav-button w-full flex items-center space-x-4 p-3 ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#92ADA4] overflow-hidden">
                    {profile?.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-xs">
                        {user?.displayName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-base">{L.personal}</span>
                </button>
              </div>

              {/* Spacer to push logout button to bottom */}
              <div className="flex-1"></div>

              {/* Logout Button - At Bottom */}
              <button 
                onClick={logout}
                className={`logout-button-gradient w-full flex items-center space-x-4 p-3 mt-4 ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
                <span className="font-medium text-base">{L.logout}</span>
              </button>
            </div>
        </aside>

        {/* Main Content Area with cream background */}
        <div className="flex-1">
          <div className={`${isDarkMode ? 'bg-gradient-to-br from-[#022F56]/60 via-[#033A6A]/55 via-[#04457E]/50 to-[#488DB4]/45 backdrop-blur-lg' : 'bg-gradient-to-br from-[#85C4E4]/60 to-[#CCDEE4]/50 backdrop-blur-lg'} rounded-[32px] h-full shadow-2xl overflow-hidden flex flex-col`}>
            {/* Header inside cream container - Fixed */}
            <div className="px-8 py-6 border-b border-gray-200/50">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                <div className="flex items-center">
                  {/* Greeting */}
                  <h2 className={`text-3xl font-bold whitespace-nowrap mr-8 ${isDarkMode ? 'text-[#F5E6D3]' : 'text-gray-900'}`}>
                    {L.hello}{' '}
                    <span
                      style={{
                        color: isDarkMode ? '#F5E6D3' : '#0d9488',
                      }}
                    >
                      {user?.displayName || user?.username || user?.email?.split('@')[0] || 'User'}
                    </span>
                  </h2>

                  {/* Search Bar - Same row as greeting */}
                  <div className="flex-1">
                    <div className={`relative search-input-wrapper ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder={L.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleSearch}
                        className={`search-input-gradient w-full px-5 py-3 pr-14 text-base placeholder:text-gray-400 ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
                      />
                      <button 
                        onClick={handleSearch}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                          isDarkMode 
                            ? 'text-gray-400 hover:text-gray-300' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <circle cx="11" cy="11" r="8"/>
                          <path d="M21 21l-4.35-4.35"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* User Info */}
                <div className="flex items-center justify-end space-x-4">
                  {/* Theme + Language Toggles */}
                  <div className="hidden md:flex items-center space-x-3 mr-2">
                    {/* Theme toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
                      }}
                      className={`header-button-gradient flex items-center justify-center h-12 w-12 ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
                      title={isDarkMode ? L.darkMode : L.lightMode}
                    >
                      {isDarkMode ? (
                        <Moon className="w-4 h-4 text-slate-100" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-400" />
                      )}
                    </button>

                    {/* Language toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const newLang = language === 'vi' ? 'en' : 'vi';
                        setLanguage(newLang);
                        localStorage.setItem('appLanguage', newLang);
                      }}
                      className={`header-button-gradient flex items-center gap-1 px-4 h-12 text-xs font-medium ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
                    >
                      <Globe className="w-4 h-4" />
                      <span className="uppercase">{language === 'vi' ? 'VI' : 'EN'}</span>
                    </button>
                  </div>

                  {/* User Avatar and Name */}
                  <button 
                    onClick={() => navigate('/personal')}
                    className={`header-button-gradient flex items-center space-x-3 px-4 h-12 ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
                  >
                    <div className="w-10 h-10 bg-[#92ADA4] rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {profile?.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-sm">
                          {user?.displayName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user?.displayName || user?.username || user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-white/70' : 'text-gray-500'}`}>
                        @{user?.displayName || user?.username || user?.email?.split('@')[0] || 'user'}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="py-6 overflow-y-auto flex-1">

            <div className="px-8">
              {/* New Posts Banner */}
              <NewPostsBanner count={newPostsCount} onLoadNew={loadNewPosts} />
              
              {/* Tag Filter Banner - Improved with Animation */}
              {tagFilter && (
                <div className="mb-6 bg-gradient-to-r from-[#92ADA4]/10 to-[#92ADA4]/5 border border-[#92ADA4]/30 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-slideDown">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#92ADA4]/20 rounded-lg">
                      <svg className="w-5 h-5 text-[#92ADA4]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">{L.filteringByTag}</p>
                      <p className="font-bold text-gray-900 text-base lowercase flex items-center gap-1">
                        <span className="text-[#92ADA4]">#</span>{tagFilter}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      console.log('🗑️ Clearing tag filter');
                      setTagFilter('');
                      window.history.pushState({}, '', '/home');
                      loadPosts(null, '', '');
                    }}
                    className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-all text-sm shadow-sm hover:shadow active:scale-95 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {L.clearFilter}
                  </button>
                </div>
              )}
              
              {/* Search Query Banner */}
              {searchQuery && !tagFilter && (
                <div className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-slideDown">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">{L.searchResultsFor}</p>
                      <p className="font-bold text-gray-900 text-base">"{searchQuery}"</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      console.log('🗑️ Clearing search query');
                      setSearchQuery('');
                      window.history.pushState({}, '', '/home');
                      loadPosts(null, '', '');
                    }}
                    className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-all text-sm shadow-sm hover:shadow active:scale-95 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {L.clearSearch}
                  </button>
                </div>
              )}
              
              {/* Loading State for Filters */}
              {loading && (tagFilter || searchQuery) && posts.length === 0 && (
                <div className="text-center py-8 bg-white rounded-2xl shadow-sm">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#92ADA4] mb-3"></div>
                  <p className="text-gray-600 font-medium">
                    {tagFilter ? `Đang tìm bài viết với tag #${tagFilter}...` : `Đang tìm kiếm "${searchQuery}"...`}
                  </p>
                </div>
              )}
              
              {/* Main Feed */}
              <div className="space-y-8">
            {loading && posts.length === 0 && !tagFilter && !searchQuery ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className={`${isDarkMode ? 'bg-white/10 backdrop-blur-lg border border-white/10' : 'bg-white/60 backdrop-blur-md border border-white/40'} rounded-3xl shadow-sm p-5 animate-pulse`}>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/6"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                  <div className="h-80 bg-gray-200 rounded-2xl mb-4"></div>
                  <div className="h-10 bg-gray-100 rounded-full"></div>
                </div>
              ))
            ) : posts.length === 0 ? (
              <div className={`${isDarkMode ? 'bg-white/10 backdrop-blur-lg border border-white/10' : 'bg-white/60 backdrop-blur-md border border-white/40'} rounded-3xl shadow-sm p-12 text-center`}>
                <div className="text-6xl mb-4">📸</div>
                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{L.noPostsTitle}</h3>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>{L.noPostsDesc}</p>
                <button
                  onClick={openModal}
                  className="text-white px-6 py-3 rounded-full hover:shadow-lg transition font-medium bg-[#92ADA4] hover:bg-[#7d9a91]"
                >
                  {L.createFirstPost}
                </button>
              </div>
            ) : (
              <>
                {posts
                  .filter((post) => !hiddenPostIds.has(post.articleId))
                  .map((post) => {
                  const isOwner = user && (
                    post.ownerId === user.sub || 
                    post.ownerId === user.username ||
                    post.ownerId === user['cognito:username']
                  );
                  const authorDisplayName = isOwner
                    ? (user?.displayName || user?.username || post.username || `User_${post.ownerId?.substring(0, 6)}`)
                    : (post.username || `User_${post.ownerId?.substring(0, 6)}`);
                  const authorInitial = authorDisplayName?.charAt(0)?.toUpperCase() || 'U';
                  
                  return (
                    <div key={post.articleId} className={`${isDarkMode ? 'bg-[#02182E]/80 backdrop-blur-lg border border-white/15' : 'bg-gradient-to-br from-[#85C4E4]/60 to-[#CCDEE4]/50 backdrop-blur-lg border border-white/15'} rounded-[32px] shadow-lg p-8`} style={{ overflow: 'visible' }}>
                      {/* User Info - Inside white container */}
                      <div className="flex items-center justify-between mb-4">
                        <div 
                          className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            if (!isOwner && post.ownerId) {
                              navigate(`/user/${post.ownerId}`);
                            }
                          }}
                        >
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#92ADA4] overflow-hidden">
                            {isOwner && profile?.avatarUrl ? (
                              <img
                                src={profile.avatarUrl}
                                alt={authorDisplayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-bold text-base">
                                {authorInitial}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className={`font-bold text-base ${isDarkMode ? 'text-[#F5E6D3]' : 'text-gray-800'}`}>
                              {authorDisplayName}
                            </p>
                            {(post.location?.name || post.location || post.locationName) && (
                              <div 
                                className={`flex items-center text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredLocation({
                                    text: post.location?.name || post.location || post.locationName,
                                    x: rect.left,
                                    y: rect.bottom + 8
                                  });
                                }}
                                onMouseLeave={() => setHoveredLocation(null)}
                              >
                                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="line-clamp-1 font-normal cursor-pointer">
                                  {post.location?.name || post.location || post.locationName}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Status Badge - Only show for owner */}
                        {isOwner && post.status && post.status !== 'approved' && (
                          <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                            post.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : post.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {post.status === 'pending' && (
                              <>
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang xử lý...
                              </>
                            )}
                            {post.status === 'rejected' && (
                              <>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                Bị từ chối
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 2-Column Layout: Image Left, Map Right */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Post Images Only */}
                        <div>
                          {(post.imageKeys && post.imageKeys.length > 0) ? (
                            <PostImageCarousel images={post.imageKeys} postTitle={post.title || post.content} />
                          ) : post.imageKey ? (
                            <div className="relative rounded-3xl overflow-hidden bg-gray-100" style={{ height: '550px' }}>
                              <img
                                src={post.imageKey.startsWith('http') 
                                  ? post.imageKey 
                                  : `https://${process.env.REACT_APP_CF_DOMAIN}/${post.imageKey}`}
                                alt={post.title || post.content}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.target.src = 'https://placehold.co/600x600/e2e8f0/64748b?text=No+Image';
                                }}
                              />
                            </div>
                          ) : null}
                        </div>

                        {/* Right: Location Map, Action Buttons, and Caption */}
                        {post.lat && post.lng && (
                          <div className="flex flex-col space-y-3">
                            {/* Time posted */}
                            <div className={`flex items-center text-sm group relative cursor-pointer ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                              <Clock className="w-4 h-4 mr-2" />
                              <span>{getTimeAgo(post.createdAt)}</span>
                              {/* Tooltip with full date/time */}
                              <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                {language === 'en'
                                  ? `Posted at ${new Date(post.createdAt).toLocaleString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                    })}`
                                  : `Đăng vào ${new Date(post.createdAt).toLocaleString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                    })}`}
                              </div>
                            </div>
                            
                            <PostMap 
                              lat={post.lat} 
                              lng={post.lng} 
                              locationName={post.locationName || post.location?.name || post.location}
                              imageUrl={
                                post.imageKeys && post.imageKeys.length > 0
                                  ? (post.imageKeys[0].startsWith('http') 
                                      ? post.imageKeys[0]
                                      : `https://${process.env.REACT_APP_CF_DOMAIN}/${post.imageKeys[0]}`)
                                  : post.imageKey
                                    ? (post.imageKey.startsWith('http')
                                        ? post.imageKey
                                        : `https://${process.env.REACT_APP_CF_DOMAIN}/${post.imageKey}`)
                                    : null
                              }
                              mapType={mapType}
                            />

                            {/* Action Buttons Below Map */}
                            <div className="flex items-center gap-3">
                              {/* Main Action Button - Like/Favorite post with Gradient Style */}
                              <button 
                                onClick={() => handleLike(post.articleId)}
                                className={`like-button-gradient flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl ${
                                  isDarkMode ? 'dark-mode' : 'light-mode'
                                } ${likedPosts.has(post.articleId) ? 'liked' : ''}`}
                              >
                                <Heart 
                                  className={`w-5 h-5 ${likedPosts.has(post.articleId) ? 'fill-current' : ''}`}
                                />
                                <span className="font-medium text-sm">
                                  {likedPosts.has(post.articleId) ? L.liked : L.like}
                                </span>
                                <ArrowRight className="w-4 h-4 arrow-icon" />
                              </button>

                              {/* More Button - Show for all posts */}
                              <div className="relative">
                                <button 
                                  onClick={() => toggleMenu(post.articleId)}
                                  className={`action-button-gradient p-3 ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="5" r="2"/>
                                    <circle cx="12" cy="12" r="2"/>
                                    <circle cx="12" cy="19" r="2"/>
                                  </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {openMenuId === post.articleId && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-[9998]" 
                                      onClick={() => setOpenMenuId(null)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl z-[9999] overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.1)' }}>
                                      {isOwner ? (
                                        <>
                                          {/* Owner menu: Edit and Delete */}
                                          <button
                                            onClick={() => handleEditPost(post)}
                                            className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition flex items-center space-x-2"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            <span>Chỉnh sửa</span>
                                          </button>
                                          <button
                                            onClick={() => handleDeletePost(post.articleId)}
                                            className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition flex items-center space-x-2"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            <span>Xóa</span>
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          {/* Non-owner menu: Hide post */}
                                          <button
                                            onClick={() => {
                                              setOpenMenuId(null);
                                              setHiddenPostIds((prev) => new Set([...prev, post.articleId]));
                                              console.log('Hide post:', post.articleId);
                                              // TODO: Implement hide post functionality
                                            }}
                                            className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition flex items-center space-x-2"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                            <span>Ẩn bài viết</span>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Post Caption Below Action Buttons */}
                            {(post.content || post.title) && (
                              <div className="mt-3 p-3">
                                <div className="flex items-start gap-3 mb-3">
                                  {/* Avatar */}
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#92ADA4] flex-shrink-0 overflow-hidden">
                                    {isOwner && profile?.avatarUrl ? (
                                      <img
                                        src={profile.avatarUrl}
                                        alt={authorDisplayName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-white font-bold text-sm">
                                        {authorInitial}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Content */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`font-semibold text-sm ${isDarkMode ? 'text-[#F5E6D3]' : 'text-gray-900'}`}>
                                        {authorDisplayName}
                                      </span>
                                      <span className={`text-xs ${isDarkMode ? 'text-white/60' : 'text-gray-400'}`}>
                                        {getTimeAgo(post.createdAt)}
                                      </span>
                                    </div>
                                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                                      {post.content || post.title}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Like Count - Always at bottom */}
                                <div className={`flex items-center gap-1.5 pl-[52px] ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                                  <Heart className="w-4 h-4" />
                                  <span className="text-sm font-medium">
                                    {post.favoriteCount || post.likeCount || 0} {L.likeCount}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Sentinel element for infinite scroll */}
                <div ref={sentinelRef} className="h-4" />
                
                {/* Loading indicator */}
                {loadingMore && (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#92ADA4]"></div>
                    <p className="text-gray-600 mt-2">Đang tải thêm bài viết...</p>
                  </div>
                )}
                
                {/* End of feed message */}
                {!nextToken && !loadingMore && posts.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">🎉 Bạn đã xem hết tất cả bài viết</p>
                  </div>
                )}
              </>
            )}
              </div>


            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
//kiệt