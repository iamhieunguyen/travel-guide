import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Fix icon marker mặc định
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Icon bài viết giống PostMap ở HomePage (thumbnail tròn + chân)
function createArticleIcon(imageUrl) {
  if (!imageUrl) return DefaultIcon;

  return L.divIcon({
    className: '',
    html: `
      <div style="position: relative; width: 50px; height: 62px;">
        <div style="
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 3px solid #8b5cf6;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          background: white;
          position: absolute;
          top: 0;
          left: 0;
        ">
          <img 
            src="${imageUrl}" 
            style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            "
            onerror="this.src='https://placehold.co/50x50/8b5cf6/white?text=📍'"
          />
        </div>
        <div style="
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 12px solid #8b5cf6;
        "></div>
      </div>
    `,
    iconSize: [50, 62],
    iconAnchor: [25, 62],
    popupAnchor: [0, -62],
  });
}

// Component để disable tất cả tương tác
function DisableInteraction() {
  const map = useMap();

  useEffect(() => {
    // Disable tất cả tương tác
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    
    // Disable zoom controls
    if (map.zoomControl) {
      map.removeControl(map.zoomControl);
    }

    // Set view to show toàn bộ thế giới (zoom level 2)
    map.setView([20, 0], 2);

    // Force invalidate size để đảm bảo map render đúng
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      // Re-enable khi unmount (nếu cần)
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    };
  }, [map]);

  return null;
}

function getTileConfig(mapType) {
  switch (mapType) {
    case 'satellite':
      return {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution:
          'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      };
    case 'roadmap':
    default:
      return {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      };
  }
}

export default function StaticMapView({ locations = [], mapType = 'roadmap' }) {
  const defaultCenter = [20, 0]; // Center để thấy toàn bộ thế giới
  const tileConfig = useMemo(() => getTileConfig(mapType), [mapType]);

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
    <div 
      className="map-container-wrapper" 
      style={{ 
        height: '100%', 
        width: '100%', 
        position: 'relative', 
        zIndex: 1, 
        display: 'block', 
        borderRadius: '24px', 
        overflow: 'hidden',
        minHeight: '500px'
      }}
    >
      <MapContainer 
        center={defaultCenter} 
        zoom={2} 
        style={{ height: '100%', width: '100%', borderRadius: '24px', minHeight: '500px' }}
        zoomControl={false}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        boxZoom={false}
        keyboard={false}
        whenReady={(map) => {
          // Đảm bảo map render đúng kích thước
          setTimeout(() => {
            map.target.invalidateSize();
          }, 100);
        }}
      >
        <TileLayer
          attribution={tileConfig.attribution}
          url={tileConfig.url}
        />
        
        <DisableInteraction />

        {validMarkers.map((marker) => (
          <Marker 
            key={marker.id} 
            position={[marker.lat, marker.lng]}
            icon={marker.image ? createArticleIcon(marker.image) : DefaultIcon}
            interactive={false}
          />
        ))}
      </MapContainer>
    </div>
  );
}

