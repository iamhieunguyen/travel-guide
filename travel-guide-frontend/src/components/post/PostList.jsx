import React from 'react';
import PostCard from './PostCard';

export default function PostList({ 
  posts, 
  user, 
  openMenuId, 
  toggleMenu, 
  handleEditPost, 
  handleDeletePost, 
  handleLike, 
  handleComment,
  formatDate,
  setOpenMenuId,
  loading,
  loadingMore,
  loadMore,
  nextToken,
  openModal
}) {
  if (loading && posts.length === 0) {
    return (
      <>
        {[...Array(3)].map((_, i) => (
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
        ))}
      </>
    );
  }

  if (posts.length === 0) {
    return (
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
    );
  }

  return (
    <>
      {posts.map((post) => (
        <PostCard
          key={post.articleId}
          post={post}
          user={user}
          openMenuId={openMenuId}
          toggleMenu={toggleMenu}
          handleEditPost={handleEditPost}
          handleDeletePost={handleDeletePost}
          handleLike={handleLike}
          handleComment={handleComment}
          formatDate={formatDate}
          setOpenMenuId={setOpenMenuId}
        />
      ))}

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
  );
}

