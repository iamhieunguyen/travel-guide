import React from 'react';
import { Heart, MessageCircle, MapPin, Clock } from 'lucide-react';
import PostImageCarousel from './PostImageCarousel';

export default function PostCard({ 
  post, 
  user, 
  openMenuId, 
  toggleMenu, 
  handleEditPost, 
  handleDeletePost, 
  handleLike, 
  handleComment,
  formatDate,
  setOpenMenuId 
}) {
  const isOwner = user && (
    post.ownerId === user.sub || 
    post.ownerId === user.username ||
    post.ownerId === user['cognito:username']
  );

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
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
}

