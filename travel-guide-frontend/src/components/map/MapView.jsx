import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix icon marker
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component quan trọng: Fix lỗi map không hiện khi chuyển tab
function MapController({ markers }) {
  const map = useMap();
  
  useEffect(() => {
    // 1. Buộc Leaflet tính lại kích thước khung hình
    // Đợi 1 tick để đảm bảo container đã render xong
    setTimeout(() => {
        map.invalidateSize();
    }, 100);

    // 2. Auto-zoom nếu có markers
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);

  return null;
}

export default function MapView({ locations = [], onMarkerClick }) {
  const defaultCenter = [16.047079, 108.206230]; 

  const validMarkers = locations.filter(
    loc => loc.location && loc.location.lat && loc.location.lng
  ).map(item => ({
    id: item.id,
    lat: item.location.lat,
    lng: item.location.lng,
    title: item.title,
    image: item.image,
    date: item.date
  }));

  return (
    // Bỏ class wrapper phức tạp, dùng style inline để chắc chắn hiện
    <div className="map-container-wrapper" style={{ height: '600px', width: '100%', position: 'relative', zIndex: 1, display: 'block' }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={6} 
        style={{ height: '100%', width: '100%', borderRadius: '16px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController markers={validMarkers} />

        {validMarkers.map((marker) => (
          <Marker 
            key={marker.id} 
            position={[marker.lat, marker.lng]}
            eventHandlers={{
              click: () => onMarkerClick && onMarkerClick(marker),
            }}
          >
            <Popup className="custom-popup">
              <div className="popup-content">
                {marker.image && <img src={marker.image} alt={marker.title} className="popup-img" />}
                <div className="popup-info">
                  <h4>{marker.title}</h4>
                  <span>{new Date(marker.date).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}