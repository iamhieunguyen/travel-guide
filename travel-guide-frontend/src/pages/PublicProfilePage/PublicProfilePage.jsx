import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  MapPin, 
  ArrowLeft,
  MoreHorizontal,
  Globe,
  LayoutGrid,
  Map,
  Heart,
  Share2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/article';
import MapView from '../../components/map/MapView';
import PostMap from '../../components/PostMap';
import './PublicProfilePage.css';

export default function PublicProfilePage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user, isAuthenticated, authChecked } = useAuth();

  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  
  const [viewMode, setViewMode] = useState('grid');
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [likedIds, setLikedIds] = useState(new Set());
  const [userLocation, setUserLocation] = useState(null);
  const mapType = user?.mapTypePref || 'roadmap';

  const journeyYears = useMemo(() => {
    if (memories.length === 0) return new Date().getFullYear();
    const years = memories.map(m => m.date.getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    return minYear === maxYear ? minYear : `${minYear} - ${maxYear}`;
  }, [memories]);

  // Redirect nếu đang xem profile của chính mình
  useEffect(() => {
    if (authChecked && user && userId === user.sub) {
      navigate('/personal');
    }
  }, [authChecked, user, userId, navigate]);

  // Lấy vị trí hiện tại của user
  useEffect(() => {
    if (!navigator.geolocation) {
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
  }, []);

  // Load bài viết công khai của user
  useEffect(() => {
    const fetchPublicMemories = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        
        // Gọi API lấy bài viết công khai của user
        const response = await api.getUserPublicArticles(userId, { 
          limit: 50
        });
        
        const items = response.items || [];
        const userProfile = response.userProfile || {};
        
        console.log('📦 Full API Response:', response);
        console.log('📦 Public articles:', items.length);
        console.log('👤 User profile:', userProfile);
        console.log('👤 User profile keys:', Object.keys(userProfile));
        console.log('👤 displayName:', userProfile.displayName);
        console.log('👤 username:', userProfile.username);

        // Map data
        const mapped = items.map(item => {
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
            scope: 'public', // Chỉ có public posts
            ownerId: item.ownerId,
            ownerName: item.ownerDisplayName || item.ownerUsername || 'Người dùng',
          };
        });
        
        setMemories(mapped);
        
        // Set profile data từ response
        setProfileData({
          displayName: userProfile.displayName || userProfile.username || userProfile.email?.split('@')[0] || 'Người dùng',
          username: userProfile.username,
          avatarUrl: userProfile.avatarUrl,
          bio: userProfile.bio || 'Khám phá những khoảnh khắc đã chia sẻ.',
          userId: userId,
        });
      } catch (error) {
        console.error('Error fetching public memories:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPublicMemories();
  }, [userId]);

  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const toggleLike = async (articleId) => {
    if (!isAuthenticated) {
      window.showSuccessToast && window.showSuccessToast('Bạn cần đăng nhập để thực hiện thao tác này');
      return;
    }
    
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
          </div>
        </div>

        <div className="journal-profile">
          <div className="avatar-container">
            {profileData?.avatarUrl ? (
              <img src={profileData.avatarUrl} alt="Avatar" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                {(profileData?.displayName || 'U')?.charAt(0)?.toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="profile-text">
            <h1 className="profile-name">
              {profileData?.displayName || 'Người dùng'}
            </h1>
            <p className="profile-bio">{profileData?.bio || 'Khám phá những khoảnh khắc đã chia sẻ.'}</p>
            <div className="profile-meta">
              <span><strong>{memories.length}</strong> bài viết công khai</span>
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
              <button className="pill active">
                <Globe size={14} /> Công khai
              </button>
            </div>
          </div>
        </nav>
      </div>

      <main className="memory-stream">
        {loading ? (
          <div className="loading-spinner">Đang tải bài viết...</div>
        ) : (
          <>
            {viewMode === 'grid' && memories.length === 0 ? (
              <div className="empty-journal">
                <div className="empty-icon">📚</div>
                <p>Người dùng này chưa có bài viết công khai nào.</p>
              </div>
            ) : (
              viewMode === 'grid' && (
                <div className="masonry-grid">
                  {memories.map((memory) => (
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
                            <span className="privacy-tag public">
                              <Globe size={14} />
                            </span>
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
                {memories.length === 0 && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 px-4 py-2 rounded-full shadow-md text-sm text-gray-500">
                    Không có địa điểm nào
                  </div>
                )}
                <MapView 
                  locations={memories} 
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
                    <span className="modal-privacy public">
                      <Globe size={14} />
                    </span>
                  </div>
                  
                  {selectedMemory.location && selectedMemory.location.lat && selectedMemory.location.lng && (
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

                  {/* Hàng nút hành động */}
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
                        {likedIds.has(selectedMemory.id) ? 'Đã quan tâm' : 'Quan tâm bài đăng'}
                      </span>
                    </button>

                    <button 
                      type="button"
                      className="p-3 bg-[#f5f5f5] hover:bg-[#92ADA4] rounded-2xl transition-colors group"
                    >
                      <Share2 className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                    </button>

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

                  <div className="modal-body">
                    {selectedMemory.description}
                  </div>
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
              <span style={{ transform: 'rotate(45deg)', display: 'block', fontSize: '24px' }}>+</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
