import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component chọn vị trí trên map
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

// Component tự động di chuyển map
function MapUpdater({ position }) {
  const map = useMap();
  
  useEffect(() => {
    if (position && position.lat && position.lng && !isNaN(position.lat) && !isNaN(position.lng)) {
      map.flyTo([position.lat, position.lng], 15, {
        duration: 1.5
      });
    }
  }, [position, map]);
  
  return null;
}

export default function LocationSelector({ onBack, onNext, initialLocation, initialSearch }) {
  const [position, setPosition] = useState(initialLocation || null);
  const [locationSearch, setLocationSearch] = useState(initialSearch || "");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Update position khi initialLocation thay đổi (khi mở edit modal)
  useEffect(() => {
    if (initialLocation && initialLocation.lat && initialLocation.lng) {
      setPosition(initialLocation);
    }
  }, [initialLocation]);

  // Update search khi initialSearch thay đổi
  useEffect(() => {
    if (initialSearch) {
      setLocationSearch(initialSearch);
    }
  }, [initialSearch]);

  // Reverse geocoding
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { 
          headers: { 
            'Accept-Language': 'en',
            'User-Agent': 'TravelGuideApp/1.0'
          } 
        }
      );
      
      if (!response.ok) {
        console.error(`Reverse geocode failed: ${response.status}`);
        return;
      }
      
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

  // Tìm kiếm vị trí
  useEffect(() => {
    if (!locationSearch || locationSearch.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    const searchLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&limit=10&addressdetails=1`,
          { 
            headers: { 
              'Accept-Language': 'en',
              'User-Agent': 'TravelGuideApp/1.0'
            } 
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          console.error('Invalid response format:', data);
          setLocationSuggestions([]);
          return;
        }
        
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

    const timeoutId = setTimeout(searchLocations, 800); // Tăng delay để tránh rate limit
    return () => clearTimeout(timeoutId);
  }, [locationSearch]);

  const handleNext = () => {
    onNext({ position, locationName: selectedLocation?.name || locationSearch });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-4 bg-white border-b relative" style={{ zIndex: 10000 }}>
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
            className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:outline-none"
          />
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Location Suggestions */}
        {showLocationSuggestions && locationSearch && locationSearch.length >= 2 && (
          <>
            <div 
              className="fixed inset-0" 
              style={{ zIndex: 9999 }}
              onClick={() => setShowLocationSuggestions(false)}
            />
            <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto" style={{ zIndex: 10001 }}>
              {isLoadingLocations ? (
                <div className="px-4 py-3 text-sm text-gray-500 flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
      <div className="flex-1 relative">
        <MapContainer
          center={position ? [position.lat, position.lng] : [10.762622, 106.660172]}
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
        
        {position && (
          <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-lg text-sm text-gray-600">
            📍 Lat: {position.lat.toFixed(4)}, Lng: {position.lng.toFixed(4)}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-between items-center py-4 px-6 bg-white border-t">
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
        >
          ← Quay lại
        </button>
        <button
          onClick={handleNext}
          disabled={!position}
          className={`px-8 py-2 rounded-lg text-white font-medium transition ${
            !position
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-[#92ADA4] hover:bg-[#7d9a91]"
          }`}
        >
          Xác nhận
        </button>
      </div>
    </div>
  );
}
