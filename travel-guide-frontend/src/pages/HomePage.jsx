// pages/HomePage.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCreatePostModal } from '../context/CreatePostModalContext';
import api from '../services/article';
import { Heart, MapPin, Clock, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import ChristmasEffects from '../components/ChristmasEffects';
import PostMap from '../components/PostMap';

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

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextToken, setNextToken] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [scope] = useState('public');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // Khởi tạo với string rỗng thay vì undefined
  const [likedPosts, setLikedPosts] = useState(new Set()); // Track liked posts
  const searchInputRef = useRef(null); // Ref for search input

  // Fetch location name
  const fetchLocationName = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'vi' } }
      );
      const data = await response.json();
      return data.display_name || `${lat}, ${lng}`;
    } catch (error) {
      return null;
    }
  };

  const loadPosts = useCallback(async (token = null, query = '') => {
    try {
      if (!token) setLoading(true);
      else setLoadingMore(true);

      let response;
      if (query && query.trim()) {
        // Nếu có search query, dùng searchArticles
        response = await api.searchArticles({
          q: query.trim(),
          scope: scope,
          limit: 10,
          nextToken: token
        });
      } else {
        // Nếu không có query, dùng listArticles bình thường
        response = await api.listArticles({
          scope: scope,
          limit: 10,
          nextToken: token
        });
      }

      const postsWithLocation = await Promise.all(
        response.items.map(async (post) => {
          if (post.lat && post.lng && !post.location) {
            const locationName = await fetchLocationName(post.lat, post.lng);
            return { ...post, location: locationName };
          }
          return post;
        })
      );

      if (token) {
        setPosts(prev => [...prev, ...postsWithLocation]);
      } else {
        setPosts(postsWithLocation);
      }
      setNextToken(response.nextToken);
    } catch (error) {
      console.error('Lỗi khi tải bài viết:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [scope]);

  const handleSearch = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      loadPosts(null, searchQuery);
    }
  };

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
    if (!authChecked) return;
    if (scope === 'mine' && !user) {
      navigate('/auth');
      return;
    }
    loadPosts();
    loadFavorites(); // Load favorites when component mounts
  }, [scope, loadPosts, loadFavorites, user, navigate, authChecked]);

  const loadMore = () => {
    if (nextToken) loadPosts(nextToken);
  };

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
        
        // Update like count
        setPosts(prev => prev.map(post => 
          post.articleId === postId 
            ? { ...post, likeCount: Math.max(0, (post.likeCount || 0) - 1) }
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
        
        // Update like count
        setPosts(prev => prev.map(post => 
          post.articleId === postId 
            ? { ...post, likeCount: (post.likeCount || 0) + 1 }
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

    if (diffDays > 0) return `${diffDays} ngày trước`;
    if (diffHours > 0) return `${diffHours} giờ trước`;
    if (diffMinutes > 0) return `${diffMinutes} phút trước`;
    return 'Vừa xong';
  };

  return (
    <div className="min-h-screen bg-[#2d2d2d]">
      {/* Christmas Effects Overlay */}
      <ChristmasEffects />
      
      <div className="flex p-3 h-screen overflow-hidden">
        {/* Left Sidebar - Icon only with hover expand - Fixed to left edge */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="fixed left-3 top-24 bottom-6 w-64 px-4 flex flex-col">
              {/* Logo/Title */}
              <div className="mb-6 px-3">
                <h1 className="text-2xl font-bold text-white">
                  TRAVEL <span className="text-[#92ADA4]">GUIDE</span>
                </h1>
              </div>

              {/* Navigation Items with Text */}
              <div className="space-y-1">
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    loadPosts(null, '');
                  }}
                  className="w-full flex items-center space-x-4 p-3 text-white hover:bg-gray-700 rounded-xl transition group"
                >
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.005 16.545a2.997 2.997 0 012.997-2.997h0A2.997 2.997 0 0115 16.545V22h7V11.543L12 2 2 11.543V22h7.005z"/>
                  </svg>
                  <span className="font-medium text-base">Trang chủ</span>
                </button>

                <button 
                  onClick={() => searchInputRef.current?.focus()}
                  className="w-full flex items-center space-x-4 p-3 text-white hover:bg-gray-700 rounded-xl transition group"
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <span className="font-medium text-base">Tìm kiếm</span>
                </button>

                <button className="w-full flex items-center space-x-4 p-3 text-white hover:bg-gray-700 rounded-xl transition group">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                  </svg>
                  <span className="font-medium text-base">Yêu thích</span>
                </button>

                <button 
                  onClick={openModal}
                  className="w-full flex items-center space-x-4 p-3 text-white hover:bg-gray-700 rounded-xl transition group"
                >
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  <span className="font-medium text-base">Tạo</span>
                </button>

                <button 
                  onClick={() => navigate('/personal')}
                  className="w-full flex items-center space-x-4 p-3 text-white hover:bg-gray-700 rounded-xl transition group"
                >
                  <div className="w-7 h-7 bg-[#92ADA4] rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {user?.displayName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="font-medium text-base">Trang cá nhân</span>
                </button>
              </div>

              {/* Spacer to push logout button to bottom */}
              <div className="flex-1"></div>

              {/* Logout Button - At Bottom */}
              <button 
                onClick={logout}
                className="w-full flex items-center space-x-4 p-3 text-white hover:bg-red-600 rounded-xl transition group border-t border-gray-700 mt-4 pt-4"
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
                <span className="font-medium text-base">Đăng xuất</span>
              </button>
            </div>
        </aside>

        {/* Main Content Area with cream background */}
        <div className="flex-1">
          <div className="bg-[#faf8f3] rounded-[32px] h-full shadow-2xl overflow-hidden flex flex-col">
            {/* Header inside cream container - Fixed */}
            <div className="px-8 py-6 border-b border-gray-200/50">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                <div className="flex items-center">
                  {/* Greeting */}
                  <h2 className="text-3xl font-bold text-gray-900 whitespace-nowrap mr-8">
                    Hello, <span className="text-[#92ADA4]">{user?.displayName || user?.username || user?.email?.split('@')[0] || 'User'}</span>
                  </h2>

                  {/* Search Bar - Same row as greeting */}
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Tìm kiếm theo vị trí, caption"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleSearch}
                        className="w-full px-5 py-3 pr-14 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                      />
                      <button 
                        onClick={handleSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
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
                  {/* Notification Icon */}
                  <button className="relative p-2 hover:bg-gray-100 rounded-full transition">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>
                    {false && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
                  </button>

                  {/* User Avatar and Name */}
                  <button 
                    onClick={() => navigate('/personal')}
                    className="flex items-center space-x-3 hover:bg-gray-100 rounded-full pr-4 py-1 transition"
                  >
                    <div className="w-10 h-10 bg-[#92ADA4] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {user?.displayName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 text-sm">
                        {user?.displayName || user?.username || user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-gray-500">
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
              {/* Main Feed */}
              <div className="space-y-8">
            {loading && posts.length === 0 ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl shadow-sm p-5 animate-pulse">
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
              <div className="bg-white rounded-3xl shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">📸</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Chưa có bài viết nào</h3>
                <p className="text-gray-600 mb-6">Hãy tạo bài viết đầu tiên của bạn!</p>
                <button
                  onClick={openModal}
                  className="text-white px-6 py-3 rounded-full hover:shadow-lg transition font-medium bg-[#92ADA4] hover:bg-[#7d9a91]"
                >
                  Tạo bài viết mới
                </button>
              </div>
            ) : (
              <>
                {posts.map((post) => {
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
                    <div key={post.articleId} className="bg-white rounded-[32px] shadow-lg overflow-hidden p-8">
                      {/* User Info - Inside white container */}
                      <div className="flex items-center mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#92ADA4]">
                            <span className="text-white font-bold text-base">
                              {authorInitial}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-base">
                              {authorDisplayName}
                            </p>
                            {(post.location?.name || post.location || post.locationName) && (
                              <div className="flex items-center text-sm group relative text-gray-500">
                                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="line-clamp-1 font-normal cursor-pointer">
                                  {post.location?.name || post.location || post.locationName}
                                </span>
                                {/* Tooltip on hover */}
                                <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-md whitespace-normal">
                                  <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                  {post.location?.name || post.location || post.locationName}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
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
                            <div className="flex items-center text-sm text-gray-500 group relative cursor-pointer">
                              <Clock className="w-4 h-4 mr-2" />
                              <span>{getTimeAgo(post.createdAt)}</span>
                              {/* Tooltip with full date/time */}
                              <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                Đăng vào {new Date(post.createdAt).toLocaleString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
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
                            />

                            {/* Action Buttons Below Map */}
                            <div className="flex items-center gap-3">
                              {/* Main Action Button - Quan tâm bài đăng */}
                              <button 
                                onClick={() => handleLike(post.articleId)}
                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-colors group ${
                                  likedPosts.has(post.articleId)
                                    ? 'bg-[#92ADA4] hover:bg-[#7d9a91]'
                                    : 'bg-[#f5f5f5] hover:bg-[#92ADA4]'
                                }`}
                              >
                                <Heart 
                                  className={`w-5 h-5 transition-colors ${
                                    likedPosts.has(post.articleId)
                                      ? 'text-white fill-white'
                                      : 'text-gray-700 group-hover:text-white'
                                  }`}
                                />
                                <span className={`font-medium text-sm transition-colors ${
                                  likedPosts.has(post.articleId)
                                    ? 'text-white'
                                    : 'text-gray-700 group-hover:text-white'
                                }`}>
                                  {likedPosts.has(post.articleId) ? 'Đã quan tâm' : 'Quan tâm bài đăng'}
                                </span>
                              </button>

                              {/* Share Button */}
                              <button 
                                className="p-3 bg-[#f5f5f5] hover:bg-[#92ADA4] rounded-2xl transition-colors group"
                              >
                                <Share2 className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                              </button>

                              {/* More Button - Show for all posts */}
                              <div className="relative">
                                <button 
                                  onClick={() => toggleMenu(post.articleId)}
                                  className="p-3 bg-[#f5f5f5] hover:bg-[#92ADA4] rounded-2xl transition-colors group"
                                >
                                  <svg className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
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
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#92ADA4] flex-shrink-0">
                                    <span className="text-white font-bold text-sm">
                                      {authorInitial}
                                    </span>
                                  </div>
                                  
                                  {/* Content */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-gray-900 text-sm">
                                        {authorDisplayName}
                                      </span>
                                      <span className="text-gray-400 text-xs">
                                        {getTimeAgo(post.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-gray-700 text-sm leading-relaxed">
                                      {post.content || post.title}
                                    </p>
                                    
                                    {/* Tags Display */}
                                    {post.tags && post.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                        {post.tags.map((tagId, index) => {
                                          const tagLabels = {
                                            'beach': '🏖️ Biển',
                                            'mountain': '⛰️ Núi',
                                            'river': '🏞️ Sông',
                                            'forest': '🌲 Rừng',
                                            'cold': '❄️ Lạnh',
                                            'hot': '🌡️ Nóng',
                                            'rain': '🌧️ Mưa',
                                            'sunny': '☀️ Nắng'
                                          };
                                          return (
                                            <span
                                              key={index}
                                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#92ADA4]/10 text-[#92ADA4] border border-[#92ADA4]/20"
                                            >
                                              {tagLabels[tagId] || tagId}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Like Count - Always at bottom */}
                                <div className="flex items-center gap-1.5 text-gray-600 pl-[52px]">
                                  <Heart className="w-4 h-4" />
                                  <span className="text-sm font-medium">
                                    {post.likeCount || 0} lượt quan tâm
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

                {nextToken && (
                  <div className="text-center py-4">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="bg-white text-gray-700 px-6 py-3 rounded-full hover:shadow-md transition disabled:opacity-50 font-medium"
                      style={{ border: '2px solid rgba(0,0,0,0.1)' }}
                    >
                      {loadingMore ? 'Đang tải...' : 'Tải thêm'}
                    </button>
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