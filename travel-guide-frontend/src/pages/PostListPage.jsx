// pages/PostListPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCreatePostModal } from '../context/CreatePostModalContext';
import api from '../services/article';
import { Heart, MessageCircle, Share, MapPin, Clock } from 'lucide-react';

export default function PostListPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextToken, setNextToken] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [scope, setScope] = useState('public'); // 'public' or 'mine'
  const [openMenuId, setOpenMenuId] = useState(null); // Track which menu is open
  
  const { user } = useAuth();
  const { openEditModal } = useCreatePostModal();
  const navigate = useNavigate();

  // Di chuyển loadPosts ra ngoài để tránh dependency loop
  const loadPosts = useCallback(async (token = null) => {
    try {
      if (!token) setLoading(true);
      else setLoadingMore(true);

      const response = await api.listArticles({
        scope: token ? scope : scope,
        limit: 10,
        nextToken: token
      });

      if (token) {
        setPosts(prev => [...prev, ...response.items]);
      } else {
        setPosts(response.items);
      }
      setNextToken(response.nextToken);
    } catch (error) {
      setError(error.message);
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [scope]);

  useEffect(() => {
    loadPosts();
  }, [scope, loadPosts]); // Thêm loadPosts vào dependency

  const loadMore = () => {
    if (nextToken) {
      loadPosts(nextToken);
    }
  };

  const handleLike = async (postId) => {
    // Implement like functionality
    console.log('Like post:', postId);
  };

  const handleComment = (postId) => {
    // Implement comment functionality
    console.log('Comment on post:', postId);
  };

  const handleShare = (postId) => {
    // Implement share functionality
    console.log('Share post:', postId);
  };

  const handleEditPost = (post) => {
    console.log('Edit post:', post);
    setOpenMenuId(null);
    openEditModal(post);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
      return;
    }

    try {
      console.log('🗑️ Đang xóa bài viết:', postId);
      const result = await api.deleteArticle(postId);
      console.log('✅ Kết quả xóa:', result);
      
      // Clear cache để refresh data
      api.clearCache();
      
      // Remove post from local state
      setPosts(prev => prev.filter(post => post.articleId !== postId));
      setOpenMenuId(null);
      alert('Xóa bài viết thành công!');
    } catch (error) {
      console.error('❌ Lỗi khi xóa bài viết:', error);
      console.error('Chi tiết lỗi:', {
        message: error.message,
        status: error.status,
        stack: error.stack
      });
      
      // Hiển thị lỗi chi tiết hơn
      let errorMsg = 'Lỗi khi xóa bài viết';
      if (error.status === 401 || error.status === 403) {
        errorMsg = 'Bạn không có quyền xóa bài viết này';
      } else if (error.status === 404) {
        errorMsg = 'Không tìm thấy bài viết';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(errorMsg);
    }
  };

  const toggleMenu = (postId) => {
    setOpenMenuId(openMenuId === postId ? null : postId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/6 mt-1"></div>
                    </div>
                  </div>
                  <div className="h-48 bg-gray-300 rounded-lg mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-full"></div>
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">Lỗi: {error}</p>
          <button
            onClick={() => loadPosts()}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Bài viết</h1>
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setScope('public')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    scope === 'public'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Công khai
                </button>
                {user && (
                  <button
                    onClick={() => setScope('mine')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                      scope === 'mine'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Của tôi
                  </button>
                )}
              </div>
              <button
                onClick={() => navigate('/home')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Tạo bài viết
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📸</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Chưa có bài viết nào</h3>
              <p className="text-gray-600 mb-6">
                {scope === 'public' 
                  ? 'Hãy tạo bài viết đầu tiên của bạn!' 
                  : 'Bạn chưa có bài viết nào. Hãy tạo bài viết đầu tiên!'}
              </p>
              <button
                onClick={() => navigate('/home')}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
              >
                Tạo bài viết mới
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {posts.map((post) => (
                  <div key={post.articleId} className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Post header */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {post.username?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {post.username || (scope === 'mine' && user?.username) || 'Ẩn danh'}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDate(post.createdAt || post.timestamp)}
                            </p>
                          </div>
                        </div>
                        <div className="relative">
                          <button 
                            onClick={() => toggleMenu(post.articleId)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          
                          {/* Dropdown Menu */}
                          {openMenuId === post.articleId && (
                            <>
                              {/* Backdrop */}
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setOpenMenuId(null)}
                              />
                              
                              {/* Menu */}
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-20 border border-gray-200 overflow-hidden">
                                <button
                                  onClick={() => handleEditPost(post)}
                                  className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2 border-b border-gray-100"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  <span className="font-medium">Chỉnh sửa</span>
                                </button>
                                <button
                                  onClick={() => handleDeletePost(post.articleId)}
                                  className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <span className="font-medium">Xóa bài viết</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {post.location && (
                        <div className="flex items-center mt-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{post.location.name || post.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Post image */}
                    {post.imageKey && (
                      <div className="relative">
                        <img
                          src={post.imageKey.startsWith('http') ? post.imageKey : `https://${process.env.REACT_APP_CF_DOMAIN}/${post.imageKey}`}
                          alt={post.title || post.content}
                          className="w-full h-96 object-cover"
                          onError={(e) => {
                            e.target.src = 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
                          }}
                        />
                      </div>
                    )}

                    {/* Post content */}
                    <div className="p-4">
                      <p className="text-gray-800 mb-3">{post.content || post.title}</p>
                      
                      {/* Post actions */}
                      <div className="flex items-center space-x-6 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleLike(post.articleId)}
                          className="flex items-center space-x-2 text-gray-600 hover:text-red-500 transition"
                        >
                          <Heart className="w-5 h-5" />
                          <span>{post.likes || 0}</span>
                        </button>
                        <button
                          onClick={() => handleComment(post.articleId)}
                          className="flex items-center space-x-2 text-gray-600 hover:text-blue-500 transition"
                        >
                          <MessageCircle className="w-5 h-5" />
                          <span>{post.comments || 0}</span>
                        </button>
                        <button
                          onClick={() => handleShare(post.articleId)}
                          className="flex items-center space-x-2 text-gray-600 hover:text-green-500 transition"
                        >
                          <Share className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {nextToken && (
                <div className="text-center mt-8">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
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
  );
}