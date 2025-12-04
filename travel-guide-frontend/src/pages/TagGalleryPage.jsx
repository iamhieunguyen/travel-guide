// pages/TagGalleryPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Heart, ExternalLink } from 'lucide-react';
import galleryApi from '../services/galleryApi';

export default function TagGalleryPage() {
  const { tagName } = useParams();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const loadPhotos = useCallback(async () => {
    if (!tagName) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading photos for tag:', tagName);
      const response = await galleryApi.getArticlesByTag({ 
        tag: tagName.toLowerCase(),
        limit: 50 
      });
      
      console.log('📦 Photos response:', response);
      
      // Dedupe photos by display key (image_url || imageKeys[0] || imageKey)
      const uniquePhotos = [];
      const seenKeys = new Set();
      
      for (const photo of (response.items || [])) {
        const displayKey = photo.image_url || photo.imageKeys?.[0] || photo.imageKey;
        if (displayKey && !seenKeys.has(displayKey)) {
          seenKeys.add(displayKey);
          uniquePhotos.push(photo);
        }
      }
      
      console.log(`✅ Deduped: ${response.items?.length || 0} → ${uniquePhotos.length} unique photos`);
      setPhotos(uniquePhotos);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError('Không thể tải ảnh. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [tagName]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const getImageUrl = (item) => {
    // Ưu tiên image_url (từ GalleryPhotosTable), sau đó imageKeys, imageKey
    const key = item.image_url || item.imageKeys?.[0] || item.imageKey;
    if (!key) return 'https://placehold.co/400x400/92ADA4/ffffff?text=No+Image';
    return key.startsWith('http') 
      ? key 
      : `https://${process.env.REACT_APP_CF_DOMAIN}/${key}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2d2d2d] via-[#3a3a3a] to-[#2d2d2d]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/gallery')}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Quay lại Trending Tags</span>
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-[#92ADA4]/20 rounded-xl">
              <svg className="w-8 h-8 text-[#92ADA4]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                #{tagName}
              </h1>
              <p className="text-white/70 text-base">
                {photos.length} {photos.length === 1 ? 'ảnh' : 'ảnh'} được gắn tag này
              </p>
              <p className="text-white/50 text-sm mt-1">
                Tất cả ảnh có chứa tag "{tagName}"
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-2xl bg-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-red-400 mb-2">Có lỗi xảy ra</h3>
            <p className="text-red-300/80 mb-6">{error}</p>
            <button
              onClick={loadPhotos}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : photos.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-xl font-bold text-white mb-2">Chưa có ảnh nào</h3>
            <p className="text-white/60 mb-6">
              Không tìm thấy ảnh nào với tag #{tagName}
            </p>
            <button
              onClick={() => navigate('/gallery')}
              className="bg-[#92ADA4] hover:bg-[#7d9a91] text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Xem các tag khác
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div
                key={photo.articleId || index}
                onClick={() => setSelectedPhoto(photo)}
                className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
              >
                <img
                  src={getImageUrl(photo)}
                  alt={photo.title || `Photo ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/400x400/92ADA4/ffffff?text=No+Image';
                  }}
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Info on hover */}
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  {photo.title && (
                    <h3 className="text-white font-bold text-sm line-clamp-2 mb-1">
                      {photo.title}
                    </h3>
                  )}
                  {photo.locationName && (
                    <div className="flex items-center gap-1 text-white/80 text-xs">
                      <MapPin className="w-3 h-3" />
                      <span className="line-clamp-1">{photo.locationName}</span>
                    </div>
                  )}
                  {photo.createdAt && (
                    <p className="text-white/60 text-xs mt-1">
                      {formatDate(photo.createdAt)}
                    </p>
                  )}
                </div>

                {/* Tags badge */}
                {photo.autoTags && photo.autoTags.length > 0 && (
                  <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-white">
                    {photo.autoTags.length} tags
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div 
            className="bg-[#2d2d2d] rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-bold text-lg line-clamp-1">
                {selectedPhoto.title || 'Chi tiết ảnh'}
              </h3>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="grid md:grid-cols-2 gap-0">
              {/* Image */}
              <div className="aspect-square md:aspect-auto md:h-[60vh] bg-black">
                <img
                  src={getImageUrl(selectedPhoto)}
                  alt={selectedPhoto.title || 'Photo'}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Info */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {selectedPhoto.content && (
                  <p className="text-white/80 mb-4">{selectedPhoto.content}</p>
                )}

                {selectedPhoto.locationName && (
                  <div className="flex items-center gap-2 text-white/70 mb-4">
                    <MapPin className="w-4 h-4 text-[#92ADA4]" />
                    <span>{selectedPhoto.locationName}</span>
                  </div>
                )}

                {selectedPhoto.createdAt && (
                  <p className="text-white/50 text-sm mb-4">
                    Đăng vào {formatDate(selectedPhoto.createdAt)}
                  </p>
                )}

                {/* Tags */}
                {(selectedPhoto.autoTags || selectedPhoto.tags) && (
                  <div className="mb-4">
                    <h4 className="text-white/60 text-sm mb-2">Tags:</h4>
                    <div className="flex flex-wrap gap-2">
                      {[...(selectedPhoto.autoTags || []), ...(selectedPhoto.tags || [])].map((tag, i) => (
                        <span
                          key={i}
                          onClick={() => {
                            setSelectedPhoto(null);
                            navigate(`/gallery/tag/${tag.toLowerCase()}`);
                          }}
                          className="bg-[#92ADA4]/20 text-[#92ADA4] px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-[#92ADA4]/30 transition-colors"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* View full article button */}
                {selectedPhoto.articleId && (
                  <button
                    onClick={() => navigate(`/home`)}
                    className="w-full bg-[#92ADA4] hover:bg-[#7d9a91] text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Xem trang chủ
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
