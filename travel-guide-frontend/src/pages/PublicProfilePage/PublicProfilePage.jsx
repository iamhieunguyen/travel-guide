import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  MapPin, 
  ArrowLeft,
  Globe,
  Heart,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useAuth } from '../../hook/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/article';
import PostMap from '../../components/PostMap';
import '../HomePage.css';
import './PublicProfilePage.css';

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

export default function PublicProfilePage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user, isAuthenticated, authChecked } = useAuth();
  const { language } = useLanguage();
  const { isDarkMode } = useTheme();

  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [likedIds, setLikedIds] = useState(new Set());
  const mapType = user?.mapTypePref || 'roadmap';
  const showLocation = user?.showLocationPref ?? true;

  const TEXT = {
    vi: {
      tagline: 'Khám phá những khoảnh khắc đã chia sẻ.',
      memories: 'kỷ ức',
      journeys: 'hành trình',
      loading: 'Đang tải ký ức...',
      empty: 'Người dùng này chưa có bài viết công khai nào.',
      noLocations: 'Không có địa điểm nào',
      liked: 'Đã quan tâm',
      like: 'Quan tâm bài đăng',
      needLogin: 'Bạn cần đăng nhập để thực hiện thao tác này',
      likeCount: 'lượt quan tâm',
    },
    en: {
      tagline: 'Explore shared moments.',
      memories: 'memories',
      journeys: 'journeys',
      loading: 'Loading memories...',
      empty: 'This user has no public posts yet.',
      noLocations: 'No locations',
      liked: 'Liked',
      like: 'Like post',
      needLogin: 'You need to log in to perform this action',
      likeCount: 'likes',
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

  // Redirect nếu đang xem profile của chính mình
  useEffect(() => {
    if (authChecked && user && userId === user.sub) {
      navigate('/personal');
    }
  }, [authChecked, user, userId, navigate]);


  // Load bài viết công khai của user
  useEffect(() => {
    const fetchPublicMemories = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        
        // Gọi API lấy bài viết công khai - sử dụng listArticles với filter
        const response = await api.listArticles({ 
          scope: 'public',
          limit: 50
        });
        
        const items = response.items || [];
        
        // Filter chỉ lấy bài viết của user này
        const userItems = items.filter(item => item.ownerId === userId);
        
        // Map data
        const mapped = userItems.map(item => {
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
            scope: 'public',
            ownerId: item.ownerId,
            ownerName: item.ownerDisplayName || item.ownerUsername || item.username || 'Người dùng',
            ownerAvatar: item.ownerAvatar || item.ownerAvatarUrl || item.authorAvatar || item.authorAvatarUrl || null,
            likeCount: item.favoriteCount || 0,
          };
        });
        
        setMemories(mapped);
        
        // Set profile data từ item đầu tiên - lấy từ response items
        if (userItems.length > 0) {
          const firstItem = userItems[0];
          setProfileData({
            displayName: firstItem.ownerDisplayName || firstItem.ownerUsername || firstItem.username || 'Người dùng',
            username: firstItem.ownerUsername || firstItem.username || null,
            avatarUrl: firstItem.ownerAvatar || firstItem.ownerAvatarUrl || firstItem.authorAvatar || firstItem.authorAvatarUrl || null,
            bio: firstItem.ownerBio || firstItem.bio || L.tagline,
            userId: userId,
          });
        } else {
          setProfileData({
            displayName: 'Người dùng',
            username: null,
            avatarUrl: null,
            bio: L.tagline,
            userId: userId,
          });
        }
      } catch (error) {
        console.error('Error fetching public memories:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPublicMemories();
  }, [userId, L.tagline]);

  // Load danh sách bài viết đã quan tâm
  useEffect(() => {
    const loadFavorites = async () => {
      if (!isAuthenticated || !user) return;
      try {
        const response = await api.listFavoriteArticles({ limit: 200 });
        const items = response?.items || [];
        const favoriteIds = new Set(items.map((item) => item.articleId));
        setLikedIds(favoriteIds);
      } catch (error) {
        console.error('Lỗi khi tải danh sách bài viết đã quan tâm:', error);
      }
    };
    loadFavorites();
  }, [isAuthenticated, user]);

  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const toggleLike = async (articleId) => {
    if (!isAuthenticated) {
      window.showSuccessToast && window.showSuccessToast(L.needLogin);
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
        window.showSuccessToast && window.showSuccessToast(
          language === 'en' ? 'Removed from favorites' : 'Đã bỏ quan tâm bài viết'
        );
      } else {
        await api.favoriteArticle(articleId);
        setLikedIds((prev) => new Set([...prev, articleId]));
        window.showSuccessToast && window.showSuccessToast(
          language === 'en' ? 'Added to favorites' : 'Đã quan tâm bài viết'
        );
      }
    } catch (error) {
      console.error('Lỗi khi toggle quan tâm:', error);
      window.showSuccessToast &&
        window.showSuccessToast(error.status === 401 ? L.needLogin : `Lỗi: ${error.message}`);
    }
  };

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
        </div>

        {/* Cover Photo - Placeholder */}
        <div className="journal-cover-photo">
          <div className="cover-photo-placeholder">
            <div className="cover-placeholder-content">
              <svg className="cover-placeholder-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="cover-placeholder-text">Ảnh bìa</p>
            </div>
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
              <span
                style={{
                  color: '#0d9488',
                }}
              >
                {profileData?.displayName || 'Người dùng'}
              </span>
            </h1>
            <p className="profile-bio">
              {profileData?.bio || L.tagline}
            </p>
            <div className="profile-meta">
              <span><strong>{memories.length}</strong> {L.memories}</span>
              <span className="dot">•</span>
              <span><strong>{journeyYears}</strong> {L.journeys}</span>
            </div>
          </div>
        </div>
      </header>


      <main className="memory-stream">
        {loading ? (
          <div className="loading-spinner">{L.loading}</div>
        ) : (
          <>
            {memories.length === 0 ? (
              <div className="empty-journal">
                <div className="empty-icon">📚</div>
                <p>{L.empty}</p>
              </div>
            ) : (
              <div className="masonry-grid">
                {memories.map((memory) => (
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
                    <span className="modal-privacy public">
                      <Globe size={14} />
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
                  </div>
                
                  <div className="modal-body">
                    <div className="modal-author">
                      <div className="modal-author-avatar">
                        {profileData?.avatarUrl ? (
                          <img src={profileData.avatarUrl} alt={profileData.displayName} />
                        ) : (
                          <span>{(profileData?.displayName || 'U')?.charAt(0)?.toUpperCase()}</span>
                        )}
                      </div>
                      <div className="modal-author-info">
                        <p className="name">{profileData?.displayName || 'Người dùng'}</p>
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
