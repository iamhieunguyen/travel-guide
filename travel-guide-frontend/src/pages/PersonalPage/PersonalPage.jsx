import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Plus,
  ArrowLeft,
  MoreHorizontal,
  Globe,
  Lock,
  LayoutGrid,
  Map,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight
  Share2
} from 'lucide-react';
import { useAuth } from '../../hook/useAuth';
import useProfile from '../../hook/useProfile';
import { useCreatePostModal } from '../../context/CreatePostModalContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/article';
import DateRangePicker from '../../components/DateRangePicker/DateRangePicker';
import MapView from '../../components/map/MapView';
import PostMap from '../../components/PostMap';
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
  const { openModal, refreshKey } = useCreatePostModal();
  const { profile } = useProfile();
  const { language } = useLanguage();

  // Đồng bộ chế độ sáng/tối với HomePage thông qua localStorage
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('homeThemeMode');
    return stored === 'dark' ? 'dark' : 'light';
  });
  const isDarkMode = themeMode === 'dark';

  const [memories, setMemories] = useState([]);
  const [favoriteMemories, setFavoriteMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState('grid');
  const [privacyFilter, setPrivacyFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null); 
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [likedIds, setLikedIds] = useState(new Set());
  const [userLocation, setUserLocation] = useState(null);
  const [hiddenMemoryIds, setHiddenMemoryIds] = useState(new Set());
  const [openMenuId, setOpenMenuId] = useState(null);
  const showLocation = user?.showLocationPref ?? true; // chỉ điều khiển marker vị trí hiện tại
  const mapType = user?.mapTypePref || 'roadmap';
  const authorDisplayName =
    user?.displayName || user?.username || user?.email?.split('@')[0] || 'User';
  const authorInitial = authorDisplayName.charAt(0).toUpperCase();
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
    },
  };

  const L = TEXT[language] || TEXT.vi;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [likedIds, setLikedIds] = useState(new Set());
  const [userLocation, setUserLocation] = useState(null);
  const showLocation = user?.showLocationPref ?? true; // chỉ điều khiển marker vị trí hiện tại
  const mapType = user?.mapTypePref || 'roadmap';

  const journeyYears = useMemo(() => {
    if (memories.length === 0) return new Date().getFullYear();
    const years = memories.map(m => m.date.getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    return minYear === maxYear ? minYear : `${minYear} - ${maxYear}`;
  }, [memories]);

  // Cập nhật lại themeMode nếu localStorage thay đổi (khi user đã toggle ở Home trước đó)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('homeThemeMode');
    if (stored && stored !== themeMode) {
      setThemeMode(stored === 'dark' ? 'dark' : 'light');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // chỉ cần sync một lần khi vào trang

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
      const matchDate = true; // hiện tại bỏ lọc ngày để đơn giản
      const notHidden = !hiddenMemoryIds.has(m.id);
      return matchPrivacy && matchFavorite && matchDate && notHidden;
    return memories.filter(m => {
      const matchPrivacy = privacyFilter === 'all' || m.scope === privacyFilter;
      const matchDate = true; // hiện tại bỏ lọc ngày để đơn giản
      return matchPrivacy && matchDate;
    });
  }, [memories, favoriteMemories, privacyFilter, hiddenMemoryIds, likedIds]);

  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
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
        window.showSuccessToast && window.showSuccessToast('Đã bỏ quan tâm bài viết');
      } else {
        await api.favoriteArticle(articleId);
        setLikedIds((prev) => new Set([...prev, articleId]));
        window.showSuccessToast && window.showSuccessToast('Đã quan tâm bài viết');
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

        setFavoriteMemories(mappedFavorites);
      } catch (error) {
        console.error('Lỗi khi tải danh sách bài viết đã quan tâm:', error);
      }
    };
    loadFavorites();
  }, [user]);

        window.showSuccessToast(error.status === 401 ? 'Bạn cần đăng nhập để thực hiện thao tác này' : `Lỗi: ${error.message}`);
    }
  };

  return (
    <div className={`journal-page ${isDarkMode ? 'journal-page--dark' : 'journal-page--light'}`}>
      <header className="journal-header">
        <div className="journal-cover">
          <div className="overlay-gradient"></div>
          <div className="header-controls">
            <button onClick={() => navigate('/home')} className="icon-btn glass">
              <ArrowLeft size={20} />
            </button>
            <button onClick={() => navigate('/settings')} className="icon-btn glass">
              <MoreHorizontal size={20} />
            </button>
          </div>
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
              {user?.displayName || user?.username || user?.email?.split('@')[0] || ''}
            </h1>
            <p className="profile-bio">Lưu giữ những mảnh ghép của cuộc đời.</p>
            <div className="profile-meta">
              <span><strong>{memories.length}</strong> kỷ ức</span>
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
              className={`view-tab ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={18} />
                <span>{L.gridView}</span>
            </button>
            <button 
              className={`view-tab ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
            >
              <Map size={18} />
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
                <p>Không tìm thấy ký ức nào phù hợp.</p>
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
                  <button onClick={openModal}>{L.writeFirst}</button>
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
                        setCurrentImageIndex(0);
                      }}
                    >
                      {memory.image && (
                        <div className="card-image">
                          <img src={memory.image} alt={memory.title} loading="lazy" />
                          <div className="card-overlay">
                            <span className={`privacy-tag ${memory.scope}`}>
                              {memory.scope === 'public' ? (
                                <Globe size={14} />
                              ) : (
                                <Lock size={14} />
                              )}
                            </span>
                            {likedIds.has(memory.id) && (
                              <span className="favorite-tag">
                                <Heart size={13} />
                            </span>
                          )}
                        </div>
                        </div>
                        )}
                            {/* Status Badge */}
                            {memory.status && memory.status !== 'approved' && (
                              <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${
                                memory.status === 'pending' 
                                  ? 'bg-yellow-500/90 text-white' 
                                  : 'bg-red-500/90 text-white'
                              }`}>
                                {memory.status === 'pending' ? '⏳ Đang xử lý' : '❌ Bị từ chối'}
                              </span>
                            )}
                          </div>
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
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 px-4 py-2 rounded-full shadow-md text-sm text-gray-500">
                    Không có địa điểm nào phù hợp với bộ lọc
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
                      setCurrentImageIndex(0);
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
            setCurrentImageIndex(0);
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
                      <span style={{ margin: '0 6px' }}>•</span>
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
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-colors group ${
                        likedIds.has(selectedMemory.id)
                          ? 'bg-[#92ADA4] hover:bg-[#7d9a91]'
                          : 'bg-[#f5f5f5] hover:bg-[#92ADA4]'
                      }`}
                    >
                      <Heart 
                        className={`w-5 h-5 transition-colors ${
                          likedIds.has(selectedMemory.id)
                            ? 'text-white fill-white'
                            : 'text-gray-700 group-hover:text-white'
                        }`}
                      />
                      <span className={`font-medium text-sm transition-colors ${
                        likedIds.has(selectedMemory.id)
                          ? 'text-white'
                          : 'text-gray-700 group-hover:text-white'
                      }`}>
                        {likedIds.has(selectedMemory.id) ? L.liked : L.like}
                      </span>
                    </button>

                    <button 
                      type="button"
                      className="p-3 bg-[#f5f5f5] hover:bg-[#92ADA4] rounded-2xl transition-colors group"
                    >
                      <Share2 className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                    </button>

                    <div className="relative">
                      <button 
                        type="button"
                        className="p-3 bg-[#f5f5f5] hover:bg-[#92ADA4] rounded-2xl transition-colors group"
                        onClick={() => setOpenMenuId(selectedMemory.id)}
                      >
                        <MoreHorizontal className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
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
                              className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition flex items-center space-x-2"
                              onClick={() => {
                                setOpenMenuId(null);
                                setHiddenMemoryIds((prev) => new Set([...prev, selectedMemory.id]));
                                setSelectedMemory(null);
                              }}
                            >
                              <span className="inline-flex w-4 h-4 items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                              </span>
                              <span>{L.hidePost}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                
                  <div className="modal-body">
                    <div className="modal-author">
                      <div className="modal-author-avatar">
                        {profile?.avatarUrl ? (
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

                  {(() => {
                    const rawKeys = selectedMemory.imageKeys && selectedMemory.imageKeys.length
                      ? selectedMemory.imageKeys
                      : (selectedMemory.image ? [selectedMemory.image] : []);
                    if (!rawKeys.length) return null;

                    const resolvedUrls = rawKeys.map((key) =>
                      typeof key === 'string' && key.startsWith('http')
                        ? key
                        : api.buildImageUrlFromKey(key)
                    );
                    const safeIndex = Math.min(currentImageIndex, resolvedUrls.length - 1);
                    const currentUrl = resolvedUrls[safeIndex];

                    const handlePrev = () => {
                      setCurrentImageIndex((prev) =>
                        prev === 0 ? resolvedUrls.length - 1 : prev - 1
                      );
                    };

                    const handleNext = () => {
                      setCurrentImageIndex((prev) =>
                        prev === resolvedUrls.length - 1 ? 0 : prev + 1
                      );
                    };

                    return (
                      <div className="modal-img-container modal-image-carousel">
                        <img src={currentUrl} alt={selectedMemory.title} />

                        {resolvedUrls.length > 1 && (
                          <>
                            <button
                              type="button"
                              className="modal-img-nav modal-img-nav-left"
                              onClick={handlePrev}
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              className="modal-img-nav modal-img-nav-right"
                              onClick={handleNext}
                            >
                              ›
                            </button>
                            <div className="modal-img-indicator">
                              {safeIndex + 1} / {resolvedUrls.length}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="modal-right">
                  <div className="modal-top-bar">
                    <span className="modal-date">
                      {formatDate(selectedMemory.date)}
                      <span style={{ margin: '0 6px' }}>•</span>
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
                  
                  {showLocation && selectedMemory.location && selectedMemory.location.lat && selectedMemory.location.lng && (
                    <div className="modal-map-wrapper">
                      <PostMap
                        lat={selectedMemory.location.lat}
                        lng={selectedMemory.location.lng}
                        locationName={selectedMemory.location.name}
                        imageUrl={selectedMemory.image}
                        mapType={mapType}
                        height={380}
                      />
                    </div>
                  )}

                  {/* Hàng nút hành động - copy style từ HomePage */}
                  <div className="flex items-center gap-3 mb-3">
                    {/* Nút quan tâm bài đăng */}
                    <button 
                      type="button"
                      onClick={() => toggleLike(selectedMemory.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-colors group ${
                        likedIds.has(selectedMemory.id)
                          ? 'bg-[#92ADA4] hover:bg-[#7d9a91]'
                          : 'bg-[#f5f5f5] hover:bg-[#92ADA4]'
                      }`}
                    >
                      <Heart 
                        className={`w-5 h-5 transition-colors ${
                          likedIds.has(selectedMemory.id)
                            ? 'text-white fill-white'
                            : 'text-gray-700 group-hover:text-white'
                        }`}
                      />
                      <span className={`font-medium text-sm transition-colors ${
                        likedIds.has(selectedMemory.id)
                          ? 'text-white'
                          : 'text-gray-700 group-hover:text-white'
                      }`}>
                        {likedIds.has(selectedMemory.id) ? 'Đã quan tâm' : 'Quan tâm bài đăng'}
                      </span>
                    </button>

                    {/* Nút share */}
                    <button 
                      type="button"
                      className="p-3 bg-[#f5f5f5] hover:bg-[#92ADA4] rounded-2xl transition-colors group"
                    >
                      <Share2 className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                    </button>

                    {/* Nút more (ba chấm) */}
                    <button 
                      type="button"
                      className="p-3 bg-[#f5f5f5] hover:bg-[#92ADA4] rounded-2xl transition-colors group"
                    >
                      <MoreHorizontal className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                    </button>
                  </div>

                  <h2 className="modal-title">{selectedMemory.title}</h2>
                  
                  {selectedMemory.location && (
                    <div className="modal-location">
                      <MapPin size={16} /> 
                      {typeof selectedMemory.location === 'object' 
                        ? selectedMemory.location.name 
                        : selectedMemory.location
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              className="close-modal-btn"
              onClick={() => {
                setSelectedMemory(null);
                setCurrentImageIndex(0);
              }}
            >
              <Plus size={32} style={{ transform: 'rotate(45deg)' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


