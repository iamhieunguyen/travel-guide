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
  Share2
} from 'lucide-react';
import { useAuth } from '../../hook/useAuth';
import useProfile from '../../hook/useProfile';
import { useCreatePostModal } from '../../context/CreatePostModalContext';
import api from '../../services/article';
import DateRangePicker from '../../components/DateRangePicker/DateRangePicker';
import MapView from '../../components/map/MapView';
import PostMap from '../../components/PostMap';
import './PersonalPage.css';

export default function PersonalPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, authChecked } = useAuth(); // Thêm authChecked
  const { openModal, refreshKey } = useCreatePostModal();
  const { profile } = useProfile();

  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState('grid');
  const [privacyFilter, setPrivacyFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null); 
  const [selectedMemory, setSelectedMemory] = useState(null);
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
    return memories.filter(m => {
      const matchPrivacy = privacyFilter === 'all' || m.scope === privacyFilter;
      const matchDate = true; // hiện tại bỏ lọc ngày để đơn giản
      return matchPrivacy && matchDate;
    });
  }, [memories, privacyFilter]);

  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const toggleLike = async (articleId) => {
    try {
      const isLiked = likedIds.has(articleId);
      if (isLiked) {
        await api.unfavoriteArticle(articleId);
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(articleId);
          return next;
        });
        window.showSuccessToast && window.showSuccessToast('Đã bỏ quan tâm bài viết');
      } else {
        await api.favoriteArticle(articleId);
        setLikedIds((prev) => new Set([...prev, articleId]));
        window.showSuccessToast && window.showSuccessToast('Đã quan tâm bài viết');
      }
    } catch (error) {
      console.error('Lỗi khi toggle quan tâm:', error);
      window.showSuccessToast &&
        window.showSuccessToast(error.status === 401 ? 'Bạn cần đăng nhập để thực hiện thao tác này' : `Lỗi: ${error.message}`);
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
              {user?.displayName || user?.username || user?.email?.split('@')[0] || ''}
            </h1>
            <p className="profile-bio">Lưu giữ những mảnh ghép của cuộc đời.</p>
            <div className="profile-meta">
              <span><strong>{memories.length}</strong> kỷ ức</span>
              <span className="dot">•</span>
              <span><strong>{journeyYears}</strong> hành trình</span>
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
                <div className="empty-icon">📚</div>
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


