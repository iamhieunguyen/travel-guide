// components/CreatePost/PostDetails.jsx
import { useState, useEffect } from "react";
import { useCreatePostModal } from "../../../context/CreatePostModalContext";
import { EMOJI_LIST } from "../../../assets/emojis";

export default function PostDetails({ 
  image = [], 
  locationData, 
  onBack, 
  onAddLocation, 
  onLocationSelect, 
  onShare 
}) {
  // ✅ Lấy caption và privacy từ Context để giữ khi chuyển trang
  const { editMode, editPostData, closeModal, handleShare, caption, setCaption, privacy, setPrivacy } = useCreatePostModal();
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [locationSearch, setLocationSearch] = useState(locationData?.locationName || "");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [hasLoadedEditData, setHasLoadedEditData] = useState(false);
  
  // Debug locationData
  useEffect(() => {
    console.log('📍 LocationData changed:', locationData);
  }, [locationData]);
  
  // Load dữ liệu khi ở chế độ edit - CHỈ caption và privacy
  useEffect(() => {
    if (editMode && editPostData && !hasLoadedEditData) {
      setHasLoadedEditData(true);
      console.log('📝 Loading edit data:', editPostData);
      const initialCaption = editPostData.content || editPostData.title || "";
      const initialPrivacy = editPostData.visibility || "public";
      console.log('📝 Initial caption:', initialCaption);
      console.log('📝 Initial privacy:', initialPrivacy);
      
      setCaption(initialCaption);
      setPrivacy(initialPrivacy);
    }
  }, [editMode, editPostData, hasLoadedEditData]);
  
  // Update locationSearch khi locationData thay đổi
  useEffect(() => {
    if (locationData?.locationName) {
      setLocationSearch(locationData.locationName);
    }
  }, [locationData]);

  // Tìm kiếm vị trí
  useEffect(() => {
    if (!locationSearch || locationSearch.length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    const searchLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&countrycodes=vn&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'vi' } }
        );
        const data = await response.json();
        
        const suggestions = data.map((item, index) => ({
          id: index,
          name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }));
        
        setLocationSuggestions(suggestions);
        setShowLocationSuggestions(true);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    const timeoutId = setTimeout(searchLocations, 500);
    return () => clearTimeout(timeoutId);
  }, [locationSearch]);

  const currentImage = Array.isArray(image) ? image[activeIndex] : image;

  // Get aspect ratio from context
  const { aspect } = useCreatePostModal();
  
  const getAspectStyle = () => {
    if (aspect === "1:1") return "100%";
    if (aspect === "4:5") return `${(5 / 4) * 100}%`;
    if (aspect === "16:9") return `${(9 / 16) * 100}%`;
    return "100%";
  };

  const handleSharePost = async () => {
    try {
      console.log('🔍 Current locationData:', locationData);
      console.log('🔍 Current caption:', caption);
      console.log('🔍 Current privacy:', privacy);
      
      // Validate dữ liệu
      if (!caption?.trim() || !locationData) {
        alert('Vui lòng nhập caption và chọn vị trí');
        return;
      }

      // Chuẩn bị dữ liệu để gửi
      const postData = {
        image: image,
        caption: caption.trim(),
        location: {
          name: locationData.locationName,
          lat: locationData.position.lat,
          lng: locationData.position.lng,
        },
        privacy: privacy
      };

      console.log('📤 Dữ liệu đăng bài:', postData);
      
      // Gọi hàm xử lý đăng bài từ context
      await handleShare(postData);
      
      // Hiển thị toast
      const message = editMode ? 'Cập nhật bài viết thành công!' : 'Đăng bài thành công!';
      if (window.showSuccessToast) {
        window.showSuccessToast(message);
      }
      
      // Đóng modal sau 500ms
      setTimeout(() => {
        closeModal();
        
        // Reset form
        setCaption('');
        setLocationSearch('');
        setShowLocationSuggestions(false);
        setHasLoadedEditData(false);
        
        // Reload trang nếu là edit mode
        if (editMode) {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Lỗi khi đăng bài:', error);
      alert('Lỗi: ' + (error.message || 'Không thể đăng bài. Vui lòng thử lại.'));
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4">
      {/* --- Ảnh preview (50%) --- */}
      <div className="md:w-1/2 w-full flex flex-col justify-center items-center bg-black rounded-xl overflow-hidden relative">
        {currentImage && (
          <div className="relative w-full h-full flex items-center justify-center">
            <div
              className="relative"
              style={{
                width: aspect === "4:5" ? "80%" : "100%",
                paddingTop: aspect === "original" ? "100%" : getAspectStyle(),
              }}
            >
              <img
                src={currentImage}
                alt="preview"
                className="absolute top-0 left-0 w-full h-full object-cover transition-all"
              />
            </div>
          </div>
        )}

        {/* Navigation buttons - chỉ hiện khi có nhiều ảnh */}
        {Array.isArray(image) && image.length > 1 && (
          <>
            <button
              onClick={() =>
                setActiveIndex((prev) => (prev === 0 ? image.length - 1 : prev - 1))
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg z-10 transition-all hover:scale-110"
            >
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() =>
                setActiveIndex((prev) => (prev === image.length - 1 ? 0 : prev + 1))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg z-10 transition-all hover:scale-110"
            >
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Counter badge */}
            <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
              {activeIndex + 1} / {image.length}
            </div>
            
            {/* Indicators dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
              {image.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === activeIndex 
                      ? "bg-white w-8" 
                      : "bg-white/50 w-2 hover:bg-white/75"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Thumbnails - hiện ở dưới cùng khi có nhiều ảnh */}
        {Array.isArray(image) && image.length > 1 && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex space-x-2 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-full">
            {image.map((src, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`relative rounded-lg overflow-hidden transition-all ${
                  idx === activeIndex
                    ? "ring-2 ring-white scale-110"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={src}
                  alt={`thumb-${idx}`}
                  className="w-14 h-14 object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- Caption + Map --- */}
      <div className="md:w-1/2 w-full flex flex-col space-y-5">
        {/* Caption */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => {
              const newValue = e.target.value;
              setCaption(newValue);
            }}
            placeholder="Viết caption của bạn..."
            className="w-full h-28 p-3 pb-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute bottom-2 left-2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
            title="Thêm emoji"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          {showEmojiPicker && (
            <>
              <div 
                className="fixed inset-0 z-[9998]" 
                onClick={() => setShowEmojiPicker(false)}
              />
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 bg-white rounded-xl shadow-2xl z-[9999] w-64 max-h-80 overflow-hidden border border-gray-200">
                <div className="px-2 py-1.5 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-800">Emoji</span>
                  <button
                    onClick={() => setShowEmojiPicker(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-2 overflow-y-auto max-h-72">
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJI_LIST.map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setCaption(caption + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="text-2xl hover:bg-gray-100 rounded-lg p-1.5 transition-colors duration-150"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Location Input with Map Icon */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Vị trí
          </label>
          <div className="relative">
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => {
                setLocationSearch(e.target.value);
                setShowLocationSuggestions(true);
              }}
              onFocus={() => setShowLocationSuggestions(true)}
              placeholder="Nhập địa chỉ..."
              className="w-full p-3 pl-10 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <button
              type="button"
              onClick={onAddLocation}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Mở bản đồ"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </button>
          </div>
          
          {locationData && locationData.position && (
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-gray-600">
              <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span>
                📍 {locationData.position.lat.toFixed(6)}, {locationData.position.lng.toFixed(6)}
              </span>
            </div>
          )}

          {showLocationSuggestions && locationSearch && (
            <>
              <div 
                className="fixed inset-0 z-[9997]" 
                onClick={() => setShowLocationSuggestions(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[9998] max-h-60 overflow-y-auto">
                {isLoadingLocations ? (
                  <div className="px-4 py-3 text-sm text-gray-500 flex items-center space-x-2">
                    <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang tìm kiếm...</span>
                  </div>
                ) : locationSuggestions.length > 0 ? (
                  locationSuggestions.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => {
                        setLocationSearch(loc.name);
                        setShowLocationSuggestions(false);
                        onLocationSelect({
                          locationName: loc.name,
                          position: { lat: loc.lat, lng: loc.lng }
                        });
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-800 line-clamp-2">{loc.name}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    Không tìm thấy vị trí
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Privacy Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Quyền riêng tư
          </label>
          <button
            onClick={() => {
              const newPrivacy = privacy === "public" ? "private" : "public";
              setPrivacy(newPrivacy);
            }}
            className={`relative inline-flex items-center h-14 rounded-full w-64 transition-all duration-300 shadow-lg ${
              privacy === "public" 
                ? "bg-gray-900" 
                : "bg-white border-2 border-gray-900"
            }`}
          >
            <div 
              className={`absolute top-1 h-12 w-12 rounded-full shadow-md transition-all duration-300 ease-out flex items-center justify-center ${
                privacy === "public" 
                  ? "left-1 bg-white" 
                  : "left-[calc(100%-52px)] bg-gray-900"
              }`}
            >
              {privacy === "public" ? (
                <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>
            <span className={`font-semibold text-base transition-all duration-300 ${
              privacy === "public" 
                ? "ml-16 text-white" 
                : "ml-4 text-gray-900"
            }`}>
              {privacy === "public" ? "Public" : "Private"}
            </span>
          </button>
        </div>

        {/* Buttons */}
        <div className="flex justify-between pt-2">
          <button
            onClick={onBack}
            className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            ← Quay lại
          </button>
          <button
            onClick={handleSharePost}
            disabled={!caption?.trim() || !locationData}
            className={`px-6 py-2 rounded-lg text-white font-medium transition ${
              !caption?.trim() || !locationData
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {editMode ? "Cập nhật" : "Đăng bài"}
          </button>
        </div>
      </div>
    </div>
  );
}