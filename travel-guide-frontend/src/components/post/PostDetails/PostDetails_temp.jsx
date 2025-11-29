// components/CreatePost/PostDetails.jsx
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useCreatePostModal } from "../../../contexts/CreatePostModalContext";

// 📍 Component chọn vị trí
function LocationPicker({ setPosition, onLocationClick }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      if (onLocationClick) {
        onLocationClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// 📍 Component tự động di chuyển map đến vị trí được chọn
function MapUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], 15, {
        duration: 1.5
      });
    }
  }, [position, map]);

  return null;
}

export default function PostDetails({ image = [], onBack, onShare }) {
  const [caption, setCaption] = useState("");
  const [position, setPosition] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Reverse geocoding 
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `lat=${lat}&` +
        `lon=${lng}&` +
        `format=json&` +
        `addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'vi',
          }
        }
      );
      const data = await response.json();

      if (data && data.display_name) {
        setLocationSearch(data.display_name);
        setSelectedLocation({
          id: 0,
          name: data.display_name,
          lat: lat,
          lng: lng,
          address: data.address
        });
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    }
  };

  // Tìm kiếm vị trí qua Nominatim API (OpenStreetMap)
  useEffect(() => {
    if (!locationSearch || locationSearch.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    const searchLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(locationSearch)}&` +
          `countrycodes=vn&` +
          `format=json&` +
          `limit=10&` +
          `addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'vi',
            }
          }
        );
        const data = await response.json();

        const suggestions = data.map((item, index) => ({
          id: index,
          name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: item.type,
          address: item.address
        }));

        setLocationSuggestions(suggestions);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setLocationSuggestions([]);
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
      // Validate dữ liệu
      if (!caption || !position) {
        alert('Vui lòng nhập caption và chọn vị trí');
        return;
      }

      // Chuẩn bị dữ liệu gửi lên server
      const postData = {
        image: currentImage,
        caption: caption,
        location: {
          name: selectedLocation?.name || locationSearch,
          lat: position.lat,
          lng: position.lng,
          address: selectedLocation?.address
        },
        privacy: 'public'
      };

      await onShare(postData);

    } catch (error) {
      console.error('Error sharing post:', error);
      alert('Lỗi khi đăng bài: ' + error.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4">
      {/* --- Ảnh preview (50%) --- */}
      <div className="md:w-1/2 w-full flex flex-col justify-center items-center bg-gray-100 rounded-xl overflow-hidden border relative">
        {Array.isArray(image) && image.length > 1 && (
          <>
            {/* Nút chuyển ảnh */}
            <button
              onClick={() =>
                setActiveIndex((prev) => (prev === 0 ? image.length - 1 : prev - 1))
              }
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-2 shadow"
            >
              ←
            </button>
            <button
              onClick={() =>
                setActiveIndex((prev) => (prev === image.length - 1 ? 0 : prev + 1))
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white rounded-full p-2 shadow"
            >
              →
            </button>
          </>
        )}

        {/* Ảnh hiện tại */}
        {currentImage && (
          <div className="relative w-full" style={{ paddingTop: getAspectStyle() }}>
            <img
              src={currentImage}
              alt="preview"
              className="absolute top-0 left-0 w-full h-full object-cover rounded-xl transition-all"
            />
          </div>
        )}

        {/* Thumbnail preview */}
        {Array.isArray(image) && image.length > 1 && (
          <div className="flex space-x-2 mt-2 absolute bottom-2">
            {image.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`thumb-${idx}`}
                onClick={() => setActiveIndex(idx)}
                className={`w-12 h-12 rounded-md cursor-pointer border-2 transition ${idx === activeIndex
                  ? "border-indigo-600"
                  : "border-transparent hover:opacity-80"
                  }`}
              />
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
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Viết caption của bạn..."
            className="w-full h-28 p-3 pb-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
          />

          {/* Nút chọn emoji */}
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

          {/* Emoji Picker */}
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      /</div>
  )
}
