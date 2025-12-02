import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Share2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCreatePostModal } from '../../context/CreatePostModalContext';
import api from '../../services/article';
import DateRangePicker from '../../components/DateRangePicker/DateRangePicker';
import MapView from '../../components/map/MapView';
import './PersonalPage.css';

// Carousel đơn giản hiển thị nhiều ảnh trong modal bài viết
function MemoryImageCarousel({ images, title }) {
  const [index, setIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const next = (e) => {
    e?.stopPropagation();
    setIndex((prev) => (prev + 1) % images.length);
  };

  const prev = (e) => {
    e?.stopPropagation();
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="modal-image-carousel">
      <div className="modal-img-container">
        <img
          src={images[index]}
          alt={`${title || 'memory'} - ${index + 1}`}
        />
      </div>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="modal-img-nav modal-img-nav-left"
            onClick={prev}
          >
            ‹
          </button>
          <button
            type="button"
            className="modal-img-nav modal-img-nav-right"
            onClick={next}
          >
            ›
          </button>
          <div className="modal-img-indicator">
            {index + 1} / {images.length}
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

  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState('grid');
  const [privacyFilter, setPrivacyFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null); 
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [likedPosts, setLikedPosts] = useState(new Set());

  const journeyYears = useMemo(() => {
    if (memories.length === 0) return new Date().getFullYear();
    const years = memories.map(m => m.date.getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    return minYear === maxYear ? minYear : `${minYear} - ${maxYear}`;
  }, [memories]);

  // Chỉ redirect khi đã check auth xong xuôi mà vẫn không có user
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      navigate('/auth?mode=login');
    }
  }, [authChecked, isAuthenticated, navigate]);

  const compare = useCallback((val1, val2) => {
    if (!val1 || !val2) return false;
    return String(val1).trim().toLowerCase() === String(val2).trim().toLowerCase();
  }, []);

  const isPostOwnedByUser = useCallback((item, currentUser) => {
    if (!item || !currentUser) return false;
    return (
      compare(item.username, currentUser.username) ||
      (currentUser.attributes?.name && compare(item.username, currentUser.attributes.name)) ||
      (currentUser.attributes?.preferred_username &&
        compare(item.username, currentUser.attributes.preferred_username)) ||
      (item.ownerId && currentUser.sub && compare(item.ownerId, currentUser.sub)) ||
      (item.ownerId && compare(item.ownerId, currentUser.username)) ||
      (item.ownerId && currentUser['cognito:username'] && compare(item.ownerId, currentUser['cognito:username']))
    );
  }, [compare]);

  const fetchMemories = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      const mineResponse = await api.listArticles({
        scope: 'mine',
        limit: 100,
        useCache: false,
      });

      const myItems = (mineResponse.items || []).filter((item) => isPostOwnedByUser(item, user));

      const sortedItems = myItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const mapped = sortedItems.map(item => {
        let locationName = "Unknown";
        if (item.locationName) {
          locationName = item.locationName;
        } else if (item.location && typeof item.location === 'string') {
          locationName = item.location;
        } else if (item.location && typeof item.location === 'object' && item.location.name) {
          locationName = item.location.name;
        }

        // Chuẩn hóa danh sách ảnh
        let images = [];
        if (Array.isArray(item.imageKeys) && item.imageKeys.length > 0) {
          images = item.imageKeys.map((key) => api.buildImageUrlFromKey(key));
        } else if (item.imageKey) {
          images = [api.buildImageUrlFromKey(item.imageKey)];
        }

        return {
          id: item.articleId,
          image: images[0] || null,
          images,
          title: item.title || "Khoảnh khắc vô danh",
          description: item.content,
          location: {
            name: locationName,
            lat: item.lat || 0,
            lng: item.lng || 0
          },
          date: new Date(item.createdAt),
          scope: item.visibility || 'public',
          tags: Array.isArray(item.tags) ? item.tags : []
        };
      });

      setMemories(mapped);
    } catch (error) {
      console.error("Error fetching personal memories:", error);
      if (window.showSuccessToast) {
        window.showSuccessToast('Không thể tải bài viết của bạn. Vui lòng thử lại hoặc kiểm tra đăng nhập.');
      }
    } finally {
      setLoading(false);
    }
  }, [user, isPostOwnedByUser]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories, refreshKey]);

  const filteredMemories = useMemo(() => {
    return memories.filter(m => {
      // 1. Filter Privacy
      const matchPrivacy = privacyFilter === 'all' || m.scope === privacyFilter;
      
      // 2. Filter Date (Tạm thời vô hiệu hóa logic so sánh ngày để debug hiển thị)
      // Chỉ cần có bài là hiện, bất chấp ngày tháng người dùng chọn
      // Logic cũ:
      /*
      let matchDate = true;
      if (dateRange?.from) { ... }
      if (matchDate && dateRange?.to) { ... }
      */
      const matchDate = true; // Force true

      return matchPrivacy && matchDate;
    });
  }, [memories, privacyFilter]);

  // Load danh sách bài viết đã quan tâm để đồng bộ nút "Quan tâm bài đăng"
  useEffect(() => {
    const loadFavorites = async () => {
      if (!user) return;
      try {
        const response = await api.listFavoriteArticles({ limit: 200 });
        if (response && response.items) {
          const ids = new Set(response.items.map(item => item.articleId));
          setLikedPosts(ids);
        }
      } catch (error) {
        console.error('Error loading favorites on PersonalPage:', error);
      }
    };

    loadFavorites();
  }, [user]);

  const handleLike = async (articleId) => {
    if (!articleId) return;
    try {
      const isLiked = likedPosts.has(articleId);

      if (isLiked) {
        await api.unfavoriteArticle(articleId);
        setLikedPosts(prev => {
          const next = new Set(prev);
          next.delete(articleId);
          return next;
        });
      } else {
        await api.favoriteArticle(articleId);
        setLikedPosts(prev => new Set([...prev, articleId]));
      }
    } catch (error) {
      console.error('Error toggling favorite on PersonalPage:', error);
      if (window.showSuccessToast) {
        window.showSuccessToast(error.message || 'Không thể cập nhật trạng thái quan tâm');
      }
    }
  };

  return (
    <div className="journal-page">
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
            {user?.picture ? (
              <img src={user.picture} alt="Avatar" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                {(user?.displayName || user?.username || user?.email)?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          
          <div className="profile-text">
            <h1 className="profile-name">{user?.displayName || user?.username || user?.email?.split('@')[0] || 'User'}</h1>
            <p className="profile-bio">{user?.bio || 'Lưu giữ những mảnh ghép của cuộc đời.'}</p>
            <div className="profile-meta">
              <span><strong>{memories.length}</strong> ký ức</span>
              <span className="dot">•</span>
              <span><strong>{journeyYears}</strong> hành trình</span>
            </div>
          </div>
        </div>
      </header>

      <div className="toolbar-sticky-wrapper">
        {/* DEBUG PANEL - Đã xóa */}
        <nav className="journal-toolbar">
          <div className="view-switcher">
            <button 
              className={`view-tab ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={18} />
              <span>Lưới ảnh</span>
            </button>
            <button 
              className={`view-tab ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
            >
              <Map size={18} />
              <span>Bản đồ</span>
            </button>
          </div>

          <div className="filter-group">
            <div className="privacy-pills">
              <button 
                className={`pill ${privacyFilter === 'all' ? 'active' : ''}`}
                onClick={() => setPrivacyFilter('all')}
              >
                Tất cả
              </button>
              <button 
                className={`pill ${privacyFilter === 'public' ? 'active' : ''}`}
                onClick={() => setPrivacyFilter('public')}
              >
                <Globe size={14} /> Công khai
              </button>
              <button 
                className={`pill ${privacyFilter === 'private' ? 'active' : ''}`}
                onClick={() => setPrivacyFilter('private')}
              >
                <Lock size={14} /> Riêng tư
              </button>
            </div>

            <div className="date-filter-wrapper">
              <DateRangePicker selected={dateRange} onSelect={setDateRange} />
            </div>
          </div>
        </nav>
      </div>

      <main className="memory-stream">
        {loading ? (
          <div className="loading-spinner">Đang tải ký ức...</div>
        ) : (
          <>
            {viewMode === 'grid' && filteredMemories.length === 0 ? (
              <div className="empty-journal">
                <div className="empty-icon">🍃</div>
                <p>Không tìm thấy ký ức nào phù hợp.</p>
                {(privacyFilter !== 'all' || dateRange) ? (
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <p className="text-sm text-gray-500">Có thể bài viết của bạn đang bị ẩn bởi bộ lọc?</p>
                    <button 
                      className="text-[#0891b2] hover:underline font-medium" 
                      onClick={() => {
                        setPrivacyFilter('all');
                        setDateRange(null);
                      }}
                    >
                      Xem tất cả bài viết
                    </button>
                  </div>
                ) : (
                  <button onClick={openModal}>Viết dòng nhật ký đầu tiên</button>
                )}
              </div>
            ) : (
              viewMode === 'grid' && (
                <div className="masonry-grid">
                  {filteredMemories.map((memory) => (
                    <div 
                      key={memory.id} 
                      className="journal-card"
                      onClick={() => setSelectedMemory(memory)}
                    >
                      <div className="card-image">
                        {memory.image ? (
                          <img src={memory.image} alt={memory.title} loading="lazy" />
                        ) : (
                          <div className="card-image-placeholder">
                            <MapPin size={28} />
                            <p>Chưa có hình ảnh</p>
                          </div>
                        )}
                        <div className={`card-chip card-chip-privacy ${memory.scope === 'public' ? 'chip-public' : 'chip-private'}`}>
                          {memory.scope === 'public' ? <Globe size={12} /> : <Lock size={12} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {viewMode === 'map' && (
              <div className="map-view-container">
                {filteredMemories.length === 0 && (
                   <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 px-4 py-2 rounded-full shadow-md text-sm text-gray-500">
                     Không có địa điểm nào phù hợp bộ lọc
                   </div>
                )}
                <MapView 
                  locations={filteredMemories} 
                  onMarkerClick={(memory) => {
                    const fullMemory = memories.find(m => m.id === memory.id);
                    if(fullMemory) setSelectedMemory(fullMemory);
                  }}
                />
              </div>
            )}
          </>
        )}
      </main>

      {selectedMemory && (
        <div className="journal-modal-backdrop" onClick={() => setSelectedMemory(null)}>
          <div className="journal-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-scroll-content">
              <div className="modal-layout">
                {/* Left: Image (có hỗ trợ nhiều ảnh) */}
                <div className="modal-left">
                  {selectedMemory.images && selectedMemory.images.length > 0 ? (
                    <MemoryImageCarousel
                      images={selectedMemory.images}
                      title={selectedMemory.title}
                    />
                  ) : (
                    selectedMemory.image && (
                      <div className="modal-img-container">
                        <img src={selectedMemory.image} alt={selectedMemory.title} />
                      </div>
                    )
                  )}
                </div>

                {/* Right: Map + Info */}
                <div className="modal-right">
                  <div className="modal-top-bar">
                    <span className="modal-date">
                      {selectedMemory.date.toLocaleDateString('vi-VN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {' • '}
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

                  {selectedMemory.location && (
                    <div className="modal-map-wrapper">
                      <MapView
                        locations={[{
                          ...selectedMemory,
                          location: {
                            name: typeof selectedMemory.location === 'object' 
                              ? selectedMemory.location.name 
                              : selectedMemory.location,
                            lat: selectedMemory.location.lat,
                            lng: selectedMemory.location.lng
                          }
                        }]}
                        onMarkerClick={() => {}}
                      />
                    </div>
                  )}

                  <div className="modal-text-content">
                    <h2 className="modal-title">{selectedMemory.title}</h2>
                    {selectedMemory.location && (
                      <div className="modal-location">
                        <MapPin size={16} /> 
                        {typeof selectedMemory.location === 'object' 
                          ? selectedMemory.location.name 
                          : selectedMemory.location}
                      </div>
                    )}

                    {/* Action buttons - giống HomePage */}
                    <div className="mt-4 flex items-center gap-3">
                      {/* Main like button */}
                      <button
                        type="button"
                        onClick={() => handleLike(selectedMemory.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-colors group ${
                          likedPosts.has(selectedMemory.id)
                            ? 'bg-[#92ADA4] hover:bg-[#7d9a91]'
                            : 'bg-[#f5f5f5] hover:bg-[#92ADA4]'
                        }`}
                      >
                        <Heart
                          className={`w-5 h-5 transition-colors ${
                            likedPosts.has(selectedMemory.id)
                              ? 'text-white fill-white'
                              : 'text-gray-700 group-hover:text-white'
                          }`}
                        />
                        <span
                          className={`font-medium text-sm transition-colors ${
                            likedPosts.has(selectedMemory.id)
                              ? 'text-white'
                              : 'text-gray-700 group-hover:text-white'
                          }`}
                        >
                          {likedPosts.has(selectedMemory.id) ? 'Đã quan tâm' : 'Quan tâm bài đăng'}
                        </span>
                      </button>

                      {/* Share button */}
                      <button
                        type="button"
                        className="p-3 bg-[#f5f5f5] hover:bg-[#92ADA4] rounded-2xl transition-colors group"
                        onClick={() => {
                          try {
                            navigator.clipboard?.writeText(window.location.href);
                            window.showSuccessToast && window.showSuccessToast('Đã sao chép link bài viết');
                          } catch {
                            console.log('Share clicked');
                          }
                        }}
                      >
                        <Share2 className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                      </button>

                      {/* More button (hiện chỉ placeholder) */}
                      <button
                        type="button"
                        className="p-3 bg-[#f5f5f5] hover:bg-[#92ADA4] rounded-2xl transition-colors group"
                        onClick={() => {
                          console.log('More actions clicked for article', selectedMemory.id);
                        }}
                      >
                        <svg className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button className="close-modal-btn" onClick={() => setSelectedMemory(null)}>
              <Plus size={32} style={{transform: 'rotate(45deg)'}}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}