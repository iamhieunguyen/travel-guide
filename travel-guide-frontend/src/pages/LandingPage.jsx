// pages/LandingPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
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
                onClick={() => navigate('/auth')}
                className="text-indigo-600 hover:text-indigo-800 transition font-medium"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Đăng ký
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-6">
            Khám phá thế giới cùng
            <span className="text-indigo-600"> Travel Guide</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Chia sẻ những khoảnh khắc đáng nhớ, khám phá những địa điểm tuyệt đẹp 
            và kết nối với cộng đồng du lịch toàn cầu
          </p>
          
          <div className="flex justify-center space-x-4 mb-12">
            <button
              onClick={() => navigate('/auth')}
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg hover:bg-indigo-700 transition text-lg font-medium"
            >
              Bắt đầu ngay
            </button>
            <button
              onClick={() => navigate('/posts')}
              className="bg-white text-indigo-600 px-8 py-4 rounded-lg hover:bg-gray-50 transition text-lg font-medium border border-indigo-200"
            >
              Xem bài viết
            </button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📸</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Chia sẻ khoảnh khắc</h3>
              <p className="text-gray-600">Lưu giữ và chia sẻ những bức ảnh đẹp từ hành trình của bạn</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📍</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Đánh dấu địa điểm</h3>
              <p className="text-gray-600">Gắn thẻ vị trí và khám phá những địa điểm tuyệt vời</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🌍</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Kết nối cộng đồng</h3>
              <p className="text-gray-600">Gặp gỡ những người yêu du lịch và chia sẻ trải nghiệm</p>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">Sẵn sàng bắt đầu hành trình của bạn?</h2>
            <p className="text-xl mb-6 opacity-90">Tham gia cộng đồng Travel Guide ngay hôm nay</p>
            <button
              onClick={() => navigate('/auth')}
              className="bg-white text-indigo-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition text-lg font-medium"
            >
              Tạo tài khoản miễn phí
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}