// pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCreatePostModal } from '../contexts/CreatePostModalContext';
import api from '../services/article';
import { Plus } from 'lucide-react';

import PostList from '../components/post/PostList';

export default function HomePage() {
  const { user, logout, authChecked } = useAuth();
  const { openModal, openEditModal } = useCreatePostModal();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  // const [error, setError] = useState(null); // Removed unused error state
  const [nextToken, setNextToken] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [scope] = useState('public'); // Removed unused setScope
  const [openMenuId, setOpenMenuId] = useState(null);

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

  const loadPosts = useCallback(async (token = null) => {
    try {
      if (!token) setLoading(true);
      else setLoadingMore(true);

      const response = await api.listArticles({
        scope: scope,
        limit: 10,
        nextToken: token
      });

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
      console.error("Error loading posts:", error);
      // setError(error.message);
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
                onClick={() => navigate('/profile')}
                className="text-[#0891b2] hover:text-[#06b6d4] transition font-medium"
              >
                Trang cá nhân
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
            <PostList 
              posts={posts}
              user={user}
              openMenuId={openMenuId}
              toggleMenu={toggleMenu}
              handleEditPost={handleEditPost}
              handleDeletePost={handleDeletePost}
              handleLike={handleLike}
              handleComment={handleComment}
              formatDate={formatDate}
              setOpenMenuId={setOpenMenuId}
              loading={loading}
              loadingMore={loadingMore}
              loadMore={loadMore}
              nextToken={nextToken}
              openModal={openModal}
            />
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