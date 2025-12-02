// pages/SmartGalleryPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Sparkles } from 'lucide-react';
import TrendingTagCard from '../components/gallery/TrendingTagCard';
import galleryApi from '../services/galleryApi';

export default function SmartGalleryPage() {
  const navigate = useNavigate();
  const [trendingTags, setTrendingTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalTags, setTotalTags] = useState(0);

  useEffect(() => {
    loadTrendingTags();
  }, []);

  const loadTrendingTags = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await galleryApi.getTrendingTags({ limit: 20 });
      
      setTrendingTags(response.items || []);
      setTotalTags(response.total_tags || 0);
    } catch (err) {
      console.error('Error loading trending tags:', err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (tag) => {
    // Navigate to search page with tag filter
    navigate(`/home?search=${encodeURIComponent(tag.tag_name)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2d2d2d] via-[#3a3a3a] to-[#2d2d2d]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Quay lại</span>
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="bg-gradient-to-r from-[#92ADA4] to-[#7d9a91] p-3 rounded-2xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                Trending Tags
              </h1>
              <p className="text-white/70 text-lg">
                Khám phá các chủ đề đang được quan tâm nhất
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>{trendingTags.length} chủ đề nổi bật</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>{totalTags} tags tổng cộng</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          // Loading Skeleton
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-2xl bg-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-red-400 mb-2">Có lỗi xảy ra</h3>
            <p className="text-red-300/80 mb-6">{error}</p>
            <button
              onClick={loadTrendingTags}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : trendingTags.length === 0 ? (
          // Empty State
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🏷️</div>
            <h3 className="text-xl font-bold text-white mb-2">Chưa có tags nào</h3>
            <p className="text-white/60 mb-6">
              Hãy tạo bài viết đầu tiên để AI phân tích và tạo tags!
            </p>
            <button
              onClick={() => navigate('/home')}
              className="bg-[#92ADA4] hover:bg-[#7d9a91] text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Về trang chủ
            </button>
          </div>
        ) : (
          // Trending Tags Grid
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {trendingTags.map((tag, index) => (
              <TrendingTagCard
                key={`${tag.tag_name}-${index}`}
                tag={tag}
                onClick={handleTagClick}
              />
            ))}
          </div>
        )}

        {/* Footer Info */}
        {!loading && !error && trendingTags.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-white/40 text-sm">
              Tags được tạo tự động bởi AWS Rekognition AI
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
