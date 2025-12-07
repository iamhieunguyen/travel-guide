import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Globe,
  Lock,
  Heart,
  Share2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus
} from 'lucide-react';
import { useAuth } from '../../hook/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/article';
import apiClient from '../../services/api';
import PostMap from '../../components/PostMap';
import '../HomePage.css';
import './UserProfilePage.css';

const resolveImageUrl = (key) => {
  if (!key) return null;
  if (typeof key === 'string' && key.startsWith('http')) return key;
  return api.buildImageUrlFromKey ? api.buildImageUrlFromKey(key) : key;
};

function UserImageCarousel({ images, postTitle }) {
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

export default function UserProfilePage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const { language } = useLanguage();
  const { isDarkMode } = useTheme();

  const [userProfile, setUserProfile] = useState(null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [likedIds, setLikedIds] = useState(new Set());
  const mapType = 'roadmap';

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
      gridView: 'Lưới ảnh',
      mapView: 'Bản đồ',
      timeFilter: 'Thời gian',
      loading: 'Đang tải...',
      empty: 'Người dùng này chưa có bài viết công khai nào.',
      noLocations: 'Không có địa điểm nào',
      liked: 'Đã quan tâm',
      like: 'Quan tâm bài đăng',
      likeCount: 'lượt quan tâm',
      bio: 'Giới thiệu',
      noBio: 'Chưa có giới thiệu',
      memories: 'kỷ ức',
      journeys: 'hành trình',
    },
    en: {
      gridView: 'Photo grid',
      mapView: 'Map',
      timeFilter: 'Time',
      loading: 'Loading...',
      empty: 'This user has no public posts yet.',
      noLocations: 'No locations',
      liked: 'Liked',
      like: 'Like post',
      likeCount: 'likes',
      bio: 'Bio',
      noBio: 'No bio yet',
      memories: 'memories',
      journeys: 'journeys',
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

  // Load public articles và profile của user này trong cùng 1 useEffect để tránh race condition
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setProfileLoading(true);
        setLoading(true);
        
        // Thử lấy từ API nếu có endpoint (dùng axios để tránh CORS)
        let profileFromAPI = null;
        try {
          const response = await apiClient.get(`/profile/${encodeURIComponent(userId)}`);
          if (response.data) {
            profileFromAPI = response.data;
            console.log('✅ UserProfilePage - Got profile from API:', profileFromAPI);
          }
        } catch (apiError) {
          // API endpoint có thể không tồn tại hoặc CORS, sẽ dùng fallback từ articles
          console.log('ℹ️ UserProfilePage - API profile endpoint not available, will use fallback from articles:', apiError.message);
        }
        
        // Lấy bài viết public của user này
        const response = await api.listArticles({ 
          scope: 'public', 
          limit: 100, 
          useCache: false 
        });
        
        // Filter bài viết theo ownerId
        const userItems = (response.items || []).filter(item => 
          item.ownerId === userId || 
          item.username === userId ||
          item.userId === userId
        );
        
        console.log('🔍 UserProfilePage - Filtered user items:', userItems.length);
        if (userItems.length > 0) {
          console.log('📋 First post data:', userItems[0]);
        }
        
        // Sort theo thời gian mới nhất
        const sortedItems = userItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const mapped = sortedItems.map(item => {
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
        
        // Ưu tiên dùng profile từ API, nếu không có thì lấy từ bài viết đầu tiên
        if (profileFromAPI) {
          setUserProfile({
            userId: userId,
            displayName: profileFromAPI.username || profileFromAPI.displayName || `User_${userId?.substring(0, 6)}`,
            bio: profileFromAPI.bio || '',
            avatarUrl: profileFromAPI.avatarUrl || (profileFromAPI.avatarKey ? api.buildImageUrlFromKey(profileFromAPI.avatarKey) : null),
          });
        } else if (mapped.length > 0 && userItems.length > 0) {
          const firstPost = userItems[0];
          console.log('👤 UserProfilePage - Updating profile from first post:', {
            username: firstPost.username,
            displayName: firstPost.displayName,
            bio: firstPost.bio,
            avatarUrl: firstPost.avatarUrl,
            avatarKey: firstPost.avatarKey,
            ownerId: firstPost.ownerId,
            userId: firstPost.userId,
          });
          
          const newDisplayName = firstPost.username || firstPost.displayName || firstPost.ownerName || `User_${userId?.substring(0, 6)}`;
          const newBio = firstPost.bio || firstPost.ownerBio || '';
          const newAvatarUrl = firstPost.avatarUrl || 
            (firstPost.avatarKey ? api.buildImageUrlFromKey(firstPost.avatarKey) : null) ||
            (firstPost.ownerAvatarKey ? api.buildImageUrlFromKey(firstPost.ownerAvatarKey) : null) ||
            (firstPost.ownerAvatarUrl ? firstPost.ownerAvatarUrl : null);
          
          console.log('✅ UserProfilePage - Setting profile:', {
            displayName: newDisplayName,
            bio: newBio,
            avatarUrl: newAvatarUrl,
          });
          
          setUserProfile({
            userId: userId,
            displayName: newDisplayName,
            bio: newBio,
            avatarUrl: newAvatarUrl,
          });
        } else {
          // Nếu không có bài viết, dùng placeholder
          console.log('⚠️ UserProfilePage - No posts found for user:', userId);
          setUserProfile({
            userId: userId,
            displayName: `User_${userId?.substring(0, 6)}`,
            bio: '',
            avatarUrl: null,
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback to placeholder
        setUserProfile({
          userId: userId,
          displayName: `User_${userId?.substring(0, 6)}`,
          bio: '',
          avatarUrl: null,
        });
      } finally {
        setProfileLoading(false);
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  // Load liked articles
  useEffect(() => {
    const fetchLikedArticles = async () => {
      try {
        const response = await api.listFavoriteArticles();
        const likedArticleIds = new Set(
          (response.items || []).map(item => item.articleId)
        );
        setLikedIds(likedArticleIds);
      } catch (error) {
        console.error('Error fetching liked articles:', error);
      }
    };

    if (currentUser) {
      fetchLikedArticles();
    }
  }, [currentUser]);

  // Không cần filter - chỉ hiển thị tất cả bài viết public
  const filteredMemories = useMemo(() => {
    return memories;
  }, [memories]);

  const toggleLike = async (articleId) => {
    if (!currentUser) {
      alert(L.needLogin || 'You need to log in to perform this action');
      return;
    }

    try {
      const isLiked = likedIds.has(articleId);
      if (isLiked) {
        await api.unfavoriteArticle(articleId);
        setLikedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(articleId);
          return newSet;
        });
      } else {
        await api.favoriteArticle(articleId);
        setLikedIds(prev => new Set([...prev, articleId]));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const displayName = userProfile?.displayName || `User_${userId?.substring(0, 6)}`;
  const displayInitial = displayName?.charAt(0)?.toUpperCase() || 'U';

  if (profileLoading || loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
        <div className="flex items-center justify-center h-screen">
          <p className={isDarkMode ? 'text-white' : 'text-gray-800'}>{L.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gradient-to-br from-[#000A14] via-[#01101E] via-[#011628] via-[#011C32] to-[#02182E]' : 'bg-gradient-to-br from-[#1E5A7A] via-[#2B7A9A] via-[#4A9BB8] via-[#6BBCD6] to-[#8DD8E8]'}`}>
      <div className={`journal-page ${isDarkMode ? 'journal-page--dark' : 'journal-page--light'}`} style={{ background: 'transparent' }}>
      <header className="journal-header">
        <div className="header-controls">
          <button 
            onClick={() => navigate(-1)} 
            className={`header-button-gradient ${isDarkMode ? 'dark-mode' : 'light-mode'} p-3 rounded-2xl`}
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        <div className="journal-profile">
          <div className="avatar-container">
            {userProfile?.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt={displayName} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                {displayInitial}
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
                {displayName}
              </span>
            </h1>
            <p className="profile-bio">
              {userProfile?.bio && userProfile.bio.trim() ? userProfile.bio : L.noBio}
            </p>
            <div className="profile-meta">
              <span><strong>{memories.length}</strong> {L.memories}</span>
              <span className="dot">•</span>
              <span><strong>{journeyYears}</strong> {L.journeys}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Không có toolbar cho trang cá nhân người khác - chỉ hiển thị ảnh */}

      <main className="memory-stream">
        {loading ? (
          <div className="loading-spinner">{L.loading}</div>
        ) : (
          <>
            {filteredMemories.length === 0 ? (
              <div className="empty-journal">
                <div className="empty-icon">📚</div>
                <p>{L.empty}</p>
              </div>
            ) : (
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
            )}
          </>
        )}
      </main>

      {/* Memory Modal */}
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
                    <UserImageCarousel
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
                  
                  {modalLat && modalLng && (
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

                    <button 
                      type="button"
                      className={`action-button-gradient ${isDarkMode ? 'dark-mode' : 'light-mode'} p-3`}
                    >
                      <Share2 className="w-5 h-5" />
                    </button>

                    <div className="relative">
                      <button 
                        type="button"
                        className={`action-button-gradient ${isDarkMode ? 'dark-mode' : 'light-mode'} p-3`}
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="modal-body">
                    <div className="modal-author">
                      <div className="modal-author-avatar">
                        {userProfile?.avatarUrl ? (
                          <img src={userProfile.avatarUrl} alt={displayName} />
                        ) : (
                          <span>{displayInitial}</span>
                        )}
                      </div>
                      <div className="modal-author-info">
                        <p className="name">{displayName}</p>
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

