// pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCreatePostModal } from '../context/CreatePostModalContext';
import api from '../services/article';
import { Heart, MessageCircle, MapPin, Clock, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

// Component hiển thị nhiều ảnh với carousel
function PostImageCarousel({ images, postTitle }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };
  
  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };
  
  if (!images || images.length === 0) return null;
  
  return (
    <div className="relative bg-black">
      <img
        src={images[currentIndex].startsWith('http') 
          ? images[currentIndex]
          : `https://${process.env.REACT_APP_CF_DOMAIN}/${images[currentIndex]}`}
        alt={`${postTitle} - ${currentIndex + 1}`}
        className="w-full h-96 object-cover"
        onError={(e) => {
          e.target.src = 'https://placehold.co/600x600/e2e8f0/64748b?text=No+Image';
        }}
      />
      
      {images.length > 1 && (
        <>
          {/* Navigation buttons */}
          <button
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition ${
                  index === currentIndex 
                    ? 'bg-white w-6' 
                    : 'bg-white/50 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
          
          {/* Counter */}
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
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
  const [error, setError] = useState(null);
  const [nextToken, setNextToken] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [scope, setScope] = useState('public');
  const [openMenuId, setOpenMenuId] = useState(null);

  // Fetch location name
// const fetchLocationName = async (lat, lng) => {
//   try {
//     const response = await fetch(
//       `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
//       { headers: { 'Accept-Language': 'vi' } }
//     );
//     const data = await response.json();
//     return data.display_name || `${lat}, ${lng}`;
//   } catch (error) {
//     return null;
//   }
// };

  // const loadPosts = useCallback(async (token = null) => {
  //   try {
  //     if (!token) setLoading(true);
  //     else setLoadingMore(true);

  //     const response = await api.listArticles({
  //       scope: scope,
  //       limit: 10,
  //       nextToken: token
  //     });

  //     const postsWithLocation = await Promise.all(
  //       response.items.map(async (post) => {
  //         if (post.lat && post.lng && !post.location) {
  //           const locationName = await fetchLocationName(post.lat, post.lng);
  //           return { ...post, location: locationName };
  //         }
  //         return post;
  //       })
  //     );

  //     if (token) {
  //       setPosts(prev => [...prev, ...postsWithLocation]);
  //     } else {
  //       setPosts(postsWithLocation);
  //     }
  //     setNextToken(response.nextToken);
  //   } catch (error) {
  //     setError(error.message);
  //   } finally {
  //     setLoading(false);
  //     setLoadingMore(false);
  //   }
  // }, [scope]);
    const loadPosts = useCallback(async (token = null) => {
    try {
      if (!token) setLoading(true);
      else setLoadingMore(true);

      const response = await api.listArticles({
        scope: scope,
        limit: 10,
        nextToken: token
      });

      // dùng luôn dữ liệu backend trả về, không gọi Nominatim ở FE nữa
      const items = response.items || [];

      if (token) {
        setPosts(prev => [...prev, ...items]);
      } else {
        setPosts(items);
      }

      setNextToken(response.nextToken);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [scope]);


  useEffect(() => {
    if (!authChecked) return;
    if (scope === 'mine' && !user) {
      navigate('/auth');
      return;
    }
    loadPosts();
  }, [scope, loadPosts, user, navigate, authChecked]);

  const loadMore = () => {
    if (nextToken) loadPosts(nextToken);
  };

  const handleLike = async (postId) => {
    console.log('Like post:', postId);
  };

  const handleComment = (postId) => {
    console.log('Comment on post:', postId);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-cyan-100/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0891b2] to-[#06b6d4] bg-clip-text text-transparent">
              MemoryMap
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/posts')}
                className="text-[#0891b2] hover:text-[#06b6d4] transition font-medium"
              >
                Bài viết
              </button>
              <button
                onClick={openModal}
                className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] text-white px-4 py-2 rounded-lg hover:shadow-lg transition"
              >
                Tạo bài viết
              </button>
              <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 max-w-7xl mx-auto">
          {/* Main Feed */}
          <div className="space-y-4">
            {loading && posts.length === 0 ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/6 mt-1"></div>
                    </div>
                  </div>
                  <div className="h-64 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              ))
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">📸</div>
                <h3 className="text-xl font-semibold text-[#0891b2] mb-2">Chưa có bài viết nào</h3>
                <p className="text-gray-600 mb-6">Hãy tạo bài viết đầu tiên của bạn!</p>
                <button
                  onClick={openModal}
                  className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] text-white px-6 py-3 rounded-lg hover:shadow-lg transition"
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
                  
                  return (
                    <div key={post.articleId} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
                      {/* Post Header */}
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-[#0891b2] to-[#06b6d4] rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {post.username?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-[#0891b2]">
                                {post.username || `User_${post.ownerId?.substring(0, 6)}`}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatDate(post.createdAt)}
                              </p>
                            </div>
                          </div>
                          {isOwner && (
                            <div className="relative">
                              <button 
                                onClick={() => toggleMenu(post.articleId)}
                                className="text-gray-400 hover:text-[#0891b2]"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                            
                              {openMenuId === post.articleId && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-[9998]" 
                                    onClick={() => setOpenMenuId(null)}
                                  />
                                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl z-[9999] border border-gray-100 overflow-hidden">
                                    <button
                                      onClick={() => handleEditPost(post)}
                                      className="w-full text-left px-4 py-3 text-[#0891b2] hover:bg-cyan-50 transition flex items-center space-x-2"
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
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {(post.location?.name || post.location) && (
                          <div className="flex items-center mt-2 text-sm text-[#0891b2]">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span className="line-clamp-1">{post.location?.name || post.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Post Images */}
                      {(post.imageKeys && post.imageKeys.length > 0) ? (
                        <PostImageCarousel images={post.imageKeys} postTitle={post.title || post.content} />
                      ) : post.imageKey ? (
                        <div className="relative">
                          <img
                            src={post.imageKey.startsWith('http') 
                              ? post.imageKey 
                              : `https://${process.env.REACT_APP_CF_DOMAIN}/${post.imageKey}`}
                            alt={post.title || post.content}
                            className="w-full h-96 object-cover"
                            onError={(e) => {
                              e.target.src = 'https://placehold.co/600x600/e2e8f0/64748b?text=No+Image';
                            }}
                          />
                        </div>
                      ) : null}

                      {/* Post Content */}
                      <div className="p-4">
                        <p className="text-gray-800 mb-3">{post.content || post.title}</p>
                        
                        {/* Post Actions */}
                        <div className="flex items-center space-x-6 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => handleLike(post.articleId)}
                            className="flex items-center space-x-2 text-gray-600 hover:text-[#06b6d4] transition"
                          >
                            <Heart className="w-5 h-5" />
                            <span>{post.likes || 0}</span>
                          </button>
                          <button
                            onClick={() => handleComment(post.articleId)}
                            className="flex items-center space-x-2 text-gray-600 hover:text-[#06b6d4] transition"
                          >
                            <MessageCircle className="w-5 h-5" />
                            <span>{post.comments || 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {nextToken && (
                  <div className="text-center py-4">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="bg-white text-[#0891b2] px-6 py-3 rounded-lg hover:shadow-md transition border-2 border-[#06b6d4] disabled:opacity-50"
                    >
                      {loadingMore ? 'Đang tải...' : 'Tải thêm'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Sidebar - Fixed */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="font-bold text-[#0891b2] mb-3">Trending</h3>
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">Chưa có dữ liệu</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="font-bold text-[#0891b2] mb-3">Gợi ý cho bạn</h3>
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">Chưa có dữ liệu</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Floating Add Button */}
      <button 
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-[#0891b2] to-[#06b6d4] text-white rounded-full shadow-lg hover:shadow-xl transition flex items-center justify-center z-50"
        onClick={openModal}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}