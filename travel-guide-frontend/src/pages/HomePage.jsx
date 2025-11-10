// pages/HomePage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCreatePostModal } from '../context/CreatePostModalContext';

export default function HomePage() {
  const { user, logout } = useAuth();
  const { openModal } = useCreatePostModal();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-indigo-600">Travel Guide</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/posts')}
                className="text-gray-600 hover:text-indigo-600 transition"
              >
                Bài viết
              </button>
              <button
                onClick={openModal}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
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

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Chào mừng đến với Travel Guide, {user?.username}!
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Chia sẻ những khoảnh khắc đáng nhớ của bạn với cộng đồng du lịch
          </p>
          
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Bắt đầu nào!</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📸</span>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Chụp ảnh</h4>
                <p className="text-gray-600">Ghi lại khoảnh khắc đẹp</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📍</span>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Thêm vị trí</h4>
                <p className="text-gray-600">Đánh dấu địa điểm bạn đã đến</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2">Chia sẻ</h4>
                <p className="text-gray-600">Kể câu chuyện của bạn</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={openModal}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition text-lg font-medium"
            >
              Tạo bài viết mới
            </button>
            <button
              onClick={() => navigate('/posts')}
              className="bg-white text-indigo-600 px-8 py-3 rounded-lg hover:bg-gray-50 transition text-lg font-medium border border-indigo-200"
            >
              Xem bài viết
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}