import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  MapPin, 
  Plus,
  ArrowLeft,
  MoreHorizontal,
  Globe,
  Lock,
  LayoutGrid,
  Map as MapIcon,
  Heart,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../hook/useAuth';
import useProfile from '../../hook/useProfile';
import { useCreatePostModal } from '../../context/CreatePostModalContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/article';
import DateRangePicker from '../../components/DateRangePicker/DateRangePicker';
import MapView from '../../components/map/MapView';
import PostMap from '../../components/PostMap';
import '../HomePage.css';
import './PersonalPage.css';

const resolveImageUrl = (key) => {
  if (!key) return null;
  if (typeof key === 'string' && key.startsWith('http')) return key;
  return api.buildImageUrlFromKey ? api.buildImageUrlFromKey(key) : key;
};

function PersonalImageCarousel({ images, postTitle }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="personal-carousel">
      <img
        src={resolveImageUrl(images[currentIndex])}
        alt={`${postTitle} - ${currentIndex + 1}`}
        onError={(e) => {
          e.target.src = 'https://placehold.co/600x600/e2e8f0/64748b?text=No+Image';
        }}
      />

      {images.length > 1 && (
        <>
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

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/75 w-2'
                }`}
              />
            ))}
          </div>

          <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function PersonalPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, authChecked } = useAuth(); // Thêm authChecked
  const { openModal, openEditModal, refreshKey } = useCreatePostModal();
  const { profile } = useProfile();
  const { language } = useLanguage();
  const { isDarkMode } = useTheme();

  const [memories, setMemories] = useState([]);
  const [favoriteMemories, setFavoriteMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [originalPostsMap, setOriginalPostsMap] = useState(new Map()); // Store original API data for editing
  
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('grid');
  const [privacyFilter, setPrivacyFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  
  // Kiểm tra URL params để tự động chọn tab "Đã quan tâm"
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'favorites') {
      setPrivacyFilter('favorites');
    }
  }, [searchParams]); 
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [likedIds, setLikedIds] = useState(new Set());
  const [userLocation, setUserLocation] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [hiddenMemoryIds, _setHiddenMemoryIds] = useState(new Set());
  const [openMenuId, setOpenMenuId] = useState(null);
  const showLocation = user?.showLocationPref ?? true; // chỉ điều khiển marker vị trí hiện tại
  const mapType = user?.mapTypePref || 'roadmap';
  // Lấy thông tin author từ selectedMemory nếu có (cho favorites), nếu không thì dùng user hiện tại
  const authorDisplayName = selectedMemory?.authorDisplayName || 
    (user?.displayName || user?.username || user?.email?.split('@')[0] || 'User');
  const authorInitial = authorDisplayName.charAt(0).toUpperCase();
  const authorAvatar = selectedMemory?.authorAvatar || null;
  const modalImages = selectedMemory
    ? selectedMemory.imageKeys && selectedMemory.imageKeys.length
      ? selectedMemory.imageKeys
      : (selectedMemory.image ? [selectedMemory.image] : [])
    : [];
  const modalLocation = selectedMemory?.location;
  const modalLocationName = modalLocation
    ? typeof modalLocation === 'object'
      ? modalLocation.name
      : modalLocation
    : '';
  const modalLat =
    modalLocation && typeof modalLocation === 'object' ? modalLocation.lat : null;
  const modalLng =
    modalLocation && typeof modalLocation === 'object' ? modalLocation.lng : null;
  const modalPrimaryImage = modalImages.length ? resolveImageUrl(modalImages[0]) : selectedMemory?.image;

  const TEXT = {
    vi: {
      tagline: 'Lưu giữ những mảnh ghép của cuộc đời.',
      memories: 'kỷ ức',
      journeys: 'hành trình',
      gridView: 'Lưới ảnh',
      mapView: 'Bản đồ',
      all: 'Tất cả',
      public: 'Công khai',
      private: 'Riêng tư',
      favorites: 'Đã quan tâm',
      timeFilter: 'Thời gian',
      loading: 'Đang tải ký ức...',
      empty: 'Không tìm thấy ký ức nào phù hợp.',
      maybeFiltered: 'Có thể bài viết của bạn đang bị ẩn bởi bộ lọc?',
      seeAllPosts: 'Xem tất cả bài viết',
      writeFirst: 'Viết dòng nhật ký đầu tiên',
      noLocations: 'Không có địa điểm nào phù hợp với bộ lọc',
      liked: 'Đã quan tâm',
      like: 'Quan tâm bài đăng',
      hidePost: 'Ẩn bài viết',
      needLogin: 'Bạn cần đăng nhập để thực hiện thao tác này',
      likeCount: 'lượt quan tâm',
      edit: 'Chỉnh sửa',
      delete: 'Xóa',
      deleteConfirm: 'Bạn có chắc chắn muốn xóa bài viết này?',
      deleteSuccess: 'Xóa bài viết thành công!',
      deleteError: 'Lỗi khi xóa bài viết',
    },
    en: {
      tagline: 'Keep the pieces of your life.',
      memories: 'memories',
      journeys: 'journeys',
      gridView: 'Photo grid',
      mapView: 'Map',
      all: 'All',
      public: 'Public',
      private: 'Private',
      favorites: 'Favorites',
      timeFilter: 'Time',
      loading: 'Loading memories...',
      empty: 'No memories match your filters.',
      maybeFiltered: 'Maybe your posts are being hidden by filters?',
      seeAllPosts: 'See all posts',
      writeFirst: 'Write your first journal entry',
      noLocations: 'No locations match your filters',
      liked: 'Liked',
      like: 'Like post',
      hidePost: 'Hide post',
      needLogin: 'You need to log in to perform this action',
      likeCount: 'likes',
      edit: 'Edit',
      delete: 'Delete',
      deleteConfirm: 'Are you sure you want to delete this post?',
      deleteSuccess: 'Post deleted successfully!',
      deleteError: 'Error deleting post',
    },
  };

  const L = TEXT[language] || TEXT.vi;

  const journeyYears = useMemo(() => {
    if (memories.length === 0) return new Date().getFullYear();
    const years = memories.map(m => m.date.getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    return minYear === maxYear ? minYear : `${minYear} - ${maxYear}`;
  }, [memories]);

  // Cập nhật lại themeMode nếu localStorage thay đổi (khi user đã toggle ở Home trước đó)
  // Theme is now managed by ThemeContext - no need for local useEffect

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      navigate('/auth?mode=login');
    }
  }, [authChecked, isAuthenticated, navigate]);

  // Lấy vị trí hiện tại của user khi bật "Hiển thị vị trí"
  useEffect(() => {
    if (!showLocation || !navigator.geolocation) {
      setUserLocation(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      (err) => {
        console.warn('Không thể lấy vị trí hiện tại:', err);
        setUserLocation(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [showLocation]);

  // Load bài viết cá nhân
  useEffect(() => {
    const fetchMemories = async () => {
      try {
        setLoading(true);
        
        // Lấy tất cả bài viết của user (public + private)
        let myItems = [];
        
        const myResponse = await api.listArticles({ 
          scope: 'mine', 
          limit: 20, 
          useCache: false 
        });
        myItems = myResponse.items || [];
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📦 My Items:', myItems.length);
        }

        // Sort theo thời gian mới nhất
        const sortedItems = myItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Store original posts for editing
        const postsMap = new Map();
        sortedItems.forEach(item => {
          postsMap.set(item.articleId, item);
        });
        setOriginalPostsMap(postsMap);

        const mapped = sortedItems.map(item => {
          // Xác định tên location (ưu tiên locationName từ backend)
          let locationName = 'Không xác định';
          if (item.locationName) {
            locationName = item.locationName;
          } else if (item.location && typeof item.location === 'string') {
            locationName = item.location;
          } else if (item.location && typeof item.location === 'object' && item.location.name) {
            locationName = item.location.name;
          }
          
          return {
            id: item.articleId,
            imageKeys: Array.isArray(item.imageKeys)
              ? item.imageKeys
              : (item.imageKey ? [item.imageKey] : []),
            image: item.imageKeys?.[0]
              ? api.buildImageUrlFromKey(item.imageKeys[0])
              : (item.imageKey ? api.buildImageUrlFromKey(item.imageKey) : null),
            title: item.title || 'Khoảnh khắc vô danh',
            description: item.content,
            location: {
              name: locationName,
              lat: item.lat || 0,
              lng: item.lng || 0,
            },
            date: new Date(item.createdAt),
            scope: item.visibility || 'public',
            likeCount: item.favoriteCount || 0,
          };
        });
        setMemories(mapped);
      } catch (error) {
        console.error('Error fetching memories:', error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchMemories();
  }, [user, refreshKey]);

  const filteredMemories = useMemo(() => {
    const base = privacyFilter === 'favorites' ? favoriteMemories : memories;

    return base.filter((m) => {
      const isFavorite = likedIds.has(m.id);
      const matchPrivacy =
        privacyFilter === 'all'
          ? true
          : privacyFilter === 'favorites'
            ? true
            : m.scope === privacyFilter;
      const matchFavorite =
        privacyFilter === 'favorites' ? isFavorite : true;
      
      // Date filter logic
      let matchDate = true;
      if (dateRange && dateRange.from) {
        // Normalize dates to start of day for comparison (ignore time)
        const memoryDate = new Date(m.date);
        memoryDate.setHours(0, 0, 0, 0);
        
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999); // End of day
          matchDate = memoryDate >= fromDate && memoryDate <= toDate;
        } else {
          // Only from date selected
          matchDate = memoryDate >= fromDate;
        }
      }
      
      // hiddenMemoryIds is always empty (setter never used), so notHidden is always true
      const notHidden = !hiddenMemoryIds.has(m.id);
      return matchPrivacy && matchFavorite && matchDate && notHidden;
    });
  }, [memories, favoriteMemories, privacyFilter, hiddenMemoryIds, likedIds, dateRange]);

  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleEditPost = (memory) => {
    setOpenMenuId(null);
    // Close the view modal first
    setSelectedMemory(null);
    
    // Small delay to ensure modal closes before opening edit modal
    setTimeout(() => {
      // Get original post data from API for accurate editing
      const originalPost = originalPostsMap.get(memory.id);
      
      if (!originalPost) {
        console.error('❌ Original post data not found for:', memory.id);
        // Fallback: use memory data
        const postData = {
          articleId: memory.id,
          title: memory.title,
          content: memory.description,
          imageKeys: memory.imageKeys || [],
          imageKey: memory.imageKeys?.[0],
          lat: memory.location?.lat,
          lng: memory.location?.lng,
          locationName: memory.location?.name,
          visibility: memory.scope || 'public',
          createdAt: memory.date.toISOString(),
        };
        console.log('📝 Opening edit modal with fallback data:', postData);
        openEditModal(postData);
        return;
      }

      // Use original post data from API - ensures correct format
      const postData = {
        articleId: originalPost.articleId,
        title: originalPost.title,
        content: originalPost.content,
        imageKeys: Array.isArray(originalPost.imageKeys) 
          ? originalPost.imageKeys 
          : (originalPost.imageKey ? [originalPost.imageKey] : []),
        imageKey: originalPost.imageKey,
        lat: originalPost.lat,
        lng: originalPost.lng,
        locationName: originalPost.locationName,
        visibility: originalPost.visibility || 'public',
        createdAt: originalPost.createdAt,
      };
      
      console.log('📝 Opening edit modal with original post data:', postData);
      openEditModal(postData);
    }, 100);
  };

  const handleDeletePost = async (memoryId) => {
    const confirmed = await window.showConfirmDialog(L.deleteConfirm);
    if (!confirmed) return;

    try {
      await api.deleteArticle(memoryId);
      api.clearCache();
      setMemories(prev => prev.filter(m => m.id !== memoryId));
      setFavoriteMemories(prev => prev.filter(m => m.id !== memoryId));
      if (selectedMemory?.id === memoryId) {
        setSelectedMemory(null);
      }
      setOpenMenuId(null);
      if (window.showSuccessToast) {
        window.showSuccessToast(L.deleteSuccess);
      }
    } catch (error) {
      if (window.showSuccessToast) {
        window.showSuccessToast(L.deleteError);
      }
    }
  };

  const toggleLike = async (articleId) => {
    try {
      const isLiked = likedIds.has(articleId);
      const adjustLikeCount = (delta) => {
        setMemories((prev) =>
          prev.map((memory) =>
            memory.id === articleId
              ? { ...memory, likeCount: Math.max(0, (memory.likeCount || 0) + delta) }
              : memory
          )
        );
        setFavoriteMemories((prev) =>
          prev.map((memory) =>
            memory.id === articleId
              ? { ...memory, likeCount: Math.max(0, (memory.likeCount || 0) + delta) }
              : memory
          )
        );
        setSelectedMemory((prev) =>
          prev && prev.id === articleId
            ? { ...prev, likeCount: Math.max(0, (prev.likeCount || 0) + delta) }
            : prev
        );
      };
      if (isLiked) {
        await api.unfavoriteArticle(articleId);
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(articleId);
          return next;
        });
        adjustLikeCount(-1);
        window.showSuccessToast && window.showSuccessToast(
          language === 'en' ? 'Removed from favorites' : 'Đã bỏ quan tâm bài viết'
        );
      } else {
        await api.favoriteArticle(articleId);
        setLikedIds((prev) => new Set([...prev, articleId]));
        adjustLikeCount(1);
        window.showSuccessToast && window.showSuccessToast(
          language === 'en' ? 'Added to favorites' : 'Đã quan tâm bài viết'
        );
      }
    } catch (error) {
      console.error('Lỗi khi toggle quan tâm:', error);
      window.showSuccessToast &&
        window.showSuccessToast(
          error.status === 401
            ? L.needLogin
            : (language === 'en' ? `Error: ${error.message}` : `Lỗi: ${error.message}`)
        );
    }
  };

  // Load danh sách bài viết đã quan tâm từ backend (giống HomePage),
  // đồng thời map thành "favoriteMemories" để hiển thị ở filter Đã quan tâm
  useEffect(() => {
    const loadFavorites = async () => {
      if (!user) return;
      try {
        const response = await api.listFavoriteArticles({ limit: 200 });
        const items = response?.items || [];

        // Set danh sách id đã quan tâm (dùng cho icon trái tim, filter,...)
        const favoriteIds = new Set(items.map((item) => item.articleId));
        setLikedIds(favoriteIds);

        // Map articles từ API thành dạng memory giống fetchMemories
        const mappedFavorites = items.map((item) => {
          let locationName = 'Không xác định';
          if (item.locationName) {
            locationName = item.locationName;
          } else if (item.location && typeof item.location === 'string') {
            locationName = item.location;
          } else if (item.location && typeof item.location === 'object' && item.location.name) {
            locationName = item.location.name;
          }

          // Lấy thông tin author từ API response
          const authorDisplayName = item.username || item.authorDisplayName || item.ownerDisplayName || `User_${item.ownerId?.substring(0, 6)}` || 'User';
          const authorAvatar = item.authorAvatar || item.ownerAvatar || null;
          const authorId = item.ownerId || item.authorId || null;

          return {
            id: item.articleId,
            imageKeys: Array.isArray(item.imageKeys)
              ? item.imageKeys
              : (item.imageKey ? [item.imageKey] : []),
            image: item.imageKeys?.[0]
              ? api.buildImageUrlFromKey(item.imageKeys[0])
              : (item.imageKey ? api.buildImageUrlFromKey(item.imageKey) : null),
            title: item.title || 'Khoảnh khắc vô danh',
            description: item.content,
            location: {
              name: locationName,
              lat: item.lat || 0,
              lng: item.lng || 0,
            },
            date: new Date(item.createdAt),
            scope: item.visibility || 'public',
            likeCount: item.favoriteCount || 0,
            // Thông tin author
            authorId: authorId,
            authorDisplayName: authorDisplayName,
            authorAvatar: authorAvatar,
          };
        });

        setFavoriteMemories(mappedFavorites);
      } catch (error) {
        console.error('Lỗi khi tải danh sách bài viết đã quan tâm:', error);
      }
    };
    loadFavorites();
  }, [user]);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-[#000A14] via-[#01101E] via-[#011628] via-[#011C32] to-[#02182E]' : 'bg-gradient-to-br from-[#1E5A7A] via-[#2B7A9A] via-[#4A9BB8] via-[#6BBCD6] to-[#8DD8E8]'}`}>
      <div className={`journal-page ${isDarkMode ? 'journal-page--dark' : 'journal-page--light'}`} style={{ background: 'transparent' }}>
      <header className="journal-header">
        <div className="header-controls">
          <button 
            onClick={() => navigate('/home')} 
            className={`header-button-gradient ${isDarkMode ? 'dark-mode' : 'light-mode'} p-3 rounded-2xl`}
          >
            <ArrowLeft size={20} />
          </button>
          <button 
            onClick={() => navigate('/settings')} 
            className={`header-button-gradient ${isDarkMode ? 'dark-mode' : 'light-mode'} p-3 rounded-2xl`}
          >
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* Cover Photo - Always show with placeholder */}
        <div className="journal-cover-photo">
          {profile?.coverUrl ? (
            <img 
              src={profile.coverUrl} 
              alt="Cover" 
              className="cover-photo-img"
            />
          ) : (
            <div className="cover-photo-placeholder">
              <div className="cover-placeholder-content">
                <svg className="cover-placeholder-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="cover-placeholder-text">Ảnh bìa</p>
              </div>
            </div>
          )}
        </div>

        <div className="journal-profile">
          <div className="avatar-container">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="avatar-img" />
            ) : user ? (
              <div className="avatar-placeholder">
                {(user.displayName || user.username || user.email)?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            ) : (
              <div className="avatar-placeholder">U</div>
            )}
          </div>
          
          <div className="profile-text">
            <h1 className="profile-name">
              <span
                style={{
                  color: '#0d9488',
                }}
              >
                {user?.displayName || user?.username || user?.email?.split('@')[0] || ''}
              </span>
            </h1>
            <p className="profile-bio">
              {(profile?.bio && profile.bio.trim()) ||
               (user?.bio && user.bio.trim()) ||
               L.tagline}
            </p>
            <div className="profile-meta">
              <span><strong>{memories.length}</strong> {L.memories}</span>
              <span className="dot">•</span>
              <span><strong>{journeyYears}</strong> {L.journeys}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="toolbar-sticky-wrapper">
        <nav className="journal-toolbar">
          <div className="view-switcher">
            <button 
              className={`sidebar-nav-button ${isDarkMode ? 'dark-mode' : 'light-mode'} ${viewMode === 'grid' ? 'active' : ''} flex items-center gap-2 px-4 py-2`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={18} />
              <span>{L.gridView}</span>
            </button>
            <button 
              className={`sidebar-nav-button ${isDarkMode ? 'dark-mode' : 'light-mode'} ${viewMode === 'map' ? 'active' : ''} flex items-center gap-2 px-4 py-2`}
              onClick={() => setViewMode('map')}
            >
              <MapIcon size={18} />
              <span>{L.mapView}</span>
            </button>
          </div>

          <div className="filter-group">
            <div className="privacy-pills">
              <button 
                className={`pill ${privacyFilter === 'all' ? 'active' : ''}`}
                onClick={() => setPrivacyFilter('all')}
              >
                {L.all}
              </button>
              <button 
                className={`pill ${privacyFilter === 'public' ? 'active' : ''}`}
                onClick={() => setPrivacyFilter('public')}
              >
                <Globe size={14} /> {L.public}
              </button>
              <button 
                className={`pill ${privacyFilter === 'private' ? 'active' : ''}`}
                onClick={() => setPrivacyFilter('private')}
              >
                <Lock size={14} /> {L.private}
              </button>
              <button 
                className={`pill ${privacyFilter === 'favorites' ? 'active' : ''}`}
                onClick={() => setPrivacyFilter('favorites')}
              >
                <Heart size={14} /> {L.favorites}
              </button>
            </div>

            <div className="date-filter-wrapper">
              <DateRangePicker
                selected={dateRange}
                onSelect={setDateRange}
                language={language}
              />
            </div>
          </div>
        </nav>
      </div>

      <main className="memory-stream">
        {loading ? (
          <div className="loading-spinner">{L.loading}</div>
        ) : (
          <>
            {viewMode === 'grid' && filteredMemories.length === 0 ? (
              <div className="empty-journal">
                <div className="empty-icon">📚</div>
                <p>{L.empty}</p>
                {(privacyFilter !== 'all' || dateRange) ? (
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <p className="text-sm text-gray-500">{L.maybeFiltered}</p>
                    <button 
                      className="text-[#0891b2] hover:underline font-medium" 
                      onClick={() => {
                        setPrivacyFilter('all');
                        setDateRange(null);
                      }}
                    >
                      {L.seeAllPosts}
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={openModal}
                  >
                    {L.writeFirst}
                  </button>
                )}
              </div>
            ) : (
              viewMode === 'grid' && (
                <div className="masonry-grid">
                  {filteredMemories.map((memory) => (
                    <div 
                      key={memory.id} 
                      className="journal-card"
                      onClick={() => {
                        setSelectedMemory(memory);
                      }}
                    >
                      {memory.image && (
                        <div className="card-image">
                          <img src={memory.image} alt={memory.title} loading="lazy" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {viewMode === 'map' && (
              <div className="map-view-container">
                {filteredMemories.length === 0 && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 px-4 py-2 rounded-full shadow-md text-sm text-gray-500">
                    {L.noLocations}
                  </div>
                )}
                <MapView 
                  locations={filteredMemories} 
                  mapType={mapType}
                  userLocation={userLocation}
                  onMarkerClick={(memory) => {
                    const fullMemory = memories.find(m => m.id === memory.id);
                    if (fullMemory) {
                      setSelectedMemory(fullMemory);
                    }
                  }}
                />
              </div>
            )}
          </>
        )}
      </main>

      {selectedMemory && (
        <div
          className="journal-modal-backdrop"
          onClick={() => {
            setSelectedMemory(null);
          }}
        >
          <div className="journal-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-scroll-content">
              <div className="modal-layout">
                <div className="modal-left">
                  <div className="modal-left-inner">
                    <PersonalImageCarousel
                      images={modalImages}
                      postTitle={selectedMemory.title || selectedMemory.description || 'Memory'}
                    />
                  </div>
                </div>

                <div className="modal-right">
                  <div className="modal-top-bar">
                    <span className="modal-date">
                      {formatDate(selectedMemory.date)}
                      <span className="date-separator-dot"></span>
                      {selectedMemory.date.toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className={`modal-privacy ${selectedMemory.scope}`}>
                      {selectedMemory.scope === 'public' ? (
                        <Globe size={14} />
                      ) : (
                        <Lock size={14} />
                      )}
                    </span>
                  </div>
                  
                  {showLocation && modalLat && modalLng && (
                    <div className="modal-map-wrapper">
                      <PostMap
                        lat={modalLat}
                        lng={modalLng}
                        locationName={modalLocationName}
                        imageUrl={modalPrimaryImage || selectedMemory.image}
                        mapType={mapType}
                        height={260}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    <button 
                      type="button"
                      onClick={() => toggleLike(selectedMemory.id)}
                      className={`like-button-gradient ${isDarkMode ? 'dark-mode' : 'light-mode'} ${likedIds.has(selectedMemory.id) ? 'liked' : ''} flex-1 flex items-center justify-center gap-2 px-6 py-3`}
                    >
                      <Heart className="w-5 h-5" />
                      <span className="font-medium text-sm">
                        {likedIds.has(selectedMemory.id) ? L.liked : L.like}
                      </span>
                    </button>

                    {/* More Button - Only show when NOT in favorites tab */}
                    {privacyFilter !== 'favorites' && (
                      <div className="relative">
                        <button 
                          type="button"
                          className={`action-button-gradient ${isDarkMode ? 'dark-mode' : 'light-mode'} p-3`}
                          onClick={() => setOpenMenuId(selectedMemory.id)}
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>

                        {openMenuId === selectedMemory.id && (
                          <>
                            <div
                              className="fixed inset-0 z-[9998]"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div
                              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl z-[9999] overflow-hidden"
                              style={{ border: '1px solid rgba(0,0,0,0.1)' }}
                            >
                              <button
                                type="button"
                                onClick={() => handleEditPost(selectedMemory)}
                                className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition flex items-center space-x-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>{L.edit}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePost(selectedMemory.id)}
                                className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition flex items-center space-x-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>{L.delete}</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                
                  <div className="modal-body">
                    <div className="modal-author">
                      <div className="modal-author-avatar">
                        {authorAvatar ? (
                          <img src={authorAvatar} alt={authorDisplayName} />
                        ) : selectedMemory?.authorDisplayName ? (
                          <span>{authorInitial}</span>
                        ) : profile?.avatarUrl ? (
                          <img src={profile.avatarUrl} alt={authorDisplayName} />
                        ) : (
                          <span>{authorInitial}</span>
                        )}
                      </div>
                      <div className="modal-author-info">
                        <p className="name">{authorDisplayName}</p>
                        {modalLocationName && (
                          <p className="location">
                            <MapPin className="w-4 h-4" />
                            <span>{modalLocationName}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {(selectedMemory.description || selectedMemory.title) && (
                      <p className="modal-content-text">
                        {selectedMemory.description || selectedMemory.title}
                      </p>
                    )}
                  </div>

                  <div className="modal-like-count">
                    <Heart className="w-4 h-4" />
                    <span>{selectedMemory.likeCount || 0} {L.likeCount}</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              className="close-modal-btn"
              onClick={() => {
                setSelectedMemory(null);
              }}
            >
              <Plus size={32} style={{ transform: 'rotate(45deg)' }} />
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}


