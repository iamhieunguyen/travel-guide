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

  useEffect(() => {
    loadTrendingTags();
  }, []);

  const loadTrendingTags = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await galleryApi.getTrendingTags({ limit: 20 });
      
      setTrendingTags(response.items || []);
    } catch (err) {
      console.error('Error loading trending tags:', err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (tag) => {
    // Navigate to tag gallery page to show all photos with this tag
    const normalizedTag = tag.tag_name.toLowerCase();
    navigate(`/gallery/tag/${encodeURIComponent(normalizedTag)}`);
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

          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Trending Tags
            </h1>
            <p className="text-white/70 text-base">
              Khám phá các chủ đề đang được quan tâm nhất • {trendingTags.length} tags
            </p>
            <p className="text-white/50 text-sm mt-2">
              💡 Hover vào tag để xem số lượng ảnh
            </p>
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
          <div className="space-y-8">
            {/* Trending Tags - This Week */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#92ADA4]" />
                  Trending Tags — This Week
                </h2>
                <button 
                  onClick={() => navigate('/home')}
                  className="text-[#92ADA4] hover:text-[#7d9a91] text-sm font-medium transition-colors"
                >
                  View all trending this week →
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {trendingTags.slice(0, 10).map((tag, index) => (
                  <TrendingTagCard
                    key={`week-${tag.tag_name}-${index}`}
                    tag={tag}
                    onClick={handleTagClick}
                  />
                ))}
              </div>
            </div>

            {/* All Time Most Popular */}
            {trendingTags.length > 10 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#92ADA4]" />
                    Tags — All Time Most Popular
                  </h2>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                  {trendingTags.slice(10).map((tag, index) => (
                    <TrendingTagCard
                      key={`all-${tag.tag_name}-${index}`}
                      tag={tag}
                      onClick={handleTagClick}
                    />
                  ))}
                </div>
              </div>
            )}
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
