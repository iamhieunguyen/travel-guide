import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useCreatePostModal } from "../CreatePostModalContext";

// 🗺️ Component chọn vị trí
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

// 🗺️ Component tự động di chuyển map đến vị trí được chọn
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

  // Reverse geocoding - Lấy tên địa điểm từ tọa độ
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
                className={`w-12 h-12 rounded-md cursor-pointer border-2 transition ${
                  idx === activeIndex
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
          {/* Nút chọn emoji - Instagram style */}
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
          
          {/* Emoji picker - Instagram style */}
          {showEmojiPicker && (
            <>
              {/* Backdrop trong suốt */}
              <div 
                className="fixed inset-0 z-[9998]" 
                onClick={() => setShowEmojiPicker(false)}
              />
              
              {/* Picker - Khung nhỏ fixed đè lên map */}
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 bg-white rounded-xl shadow-2xl z-[9999] w-64 max-h-80 overflow-hidden border border-gray-200">
                {/* Header - Thu gọn */}
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
                
                {/* Emoji grid */}
                <div className="p-2 overflow-y-auto max-h-72">
                  <div className="grid grid-cols-8 gap-1">
                    {[
                      // Smileys
                      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
                      '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
                      '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
                      '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
                      '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
                      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
                      // Hearts
                      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
                      '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
                      '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️',
                      // Travel & Places
                      '🌍', '🌎', '🌏', '🌐', '🗺️', '🗾', '🧭', '🏔️',
                      '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️',
                      '🏟️', '🏛️', '🏗️', '🧱', '🏘️', '🏚️', '🏠', '🏡',
                      '✈️', '🛫', '🛬', '🪂', '💺', '🚁', '🚂', '🚃',
                      '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝',
                      // Food
                      '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭',
                      '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🥝', '🍅',
                      '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🥒',
                      '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞',
                      '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖',
                      '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪',
                      // Activities
                      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
                      '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
                      '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊',
                      '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿',
                      // Objects
                      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️',
                      '🖲️', '🕹️', '🗜️', '💾', '💿', '📀', '📼', '📷',
                      '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟',
                      '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️',
                      // Symbols
                      '🔥', '⭐', '🌟', '✨', '⚡', '💥', '💫', '💦',
                      '💨', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️',
                      '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️',
                    ].map((emoji) => (
                      <button
                        key={emoji}
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

        {/* Location Search - Instagram style */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Thêm vị trí
          </label>
          <div className="relative">
            <input
              type="text"
              value={selectedLocation ? selectedLocation.name : locationSearch}
              onChange={(e) => {
                setLocationSearch(e.target.value);
                setSelectedLocation(null);
                setShowLocationSuggestions(true);
              }}
              onFocus={() => setShowLocationSuggestions(true)}
              placeholder="Tìm kiếm vị trí..."
              className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Location Suggestions */}
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
                        setSelectedLocation(loc);
                        setLocationSearch(loc.name);
                        setPosition({ lat: loc.lat, lng: loc.lng });
                        setShowLocationSuggestions(false);
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

        {/* Map */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Hoặc chọn trên bản đồ
          </label>
          <div className="w-full h-64 rounded-xl overflow-hidden border">
            <MapContainer
              center={[10.762622, 106.660172]}
              zoom={13}
              className="h-full w-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap"
              />
              <LocationPicker 
                setPosition={setPosition} 
                onLocationClick={reverseGeocode}
              />
              <MapUpdater position={position} />
              {position && <Marker position={position} />}
            </MapContainer>
          </div>
          {position && (
            <p className="text-sm text-gray-500 mt-2">
              📍 Lat: {position.lat.toFixed(4)}, Lng: {position.lng.toFixed(4)}
            </p>
          )}
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
            onClick={onShare}
            disabled={!caption || !position}
            className={`px-6 py-2 rounded-lg text-white font-medium transition ${
              !caption || !position
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            Đăng bài
          </button>
        </div>
      </div>
    </div>
  );
}
