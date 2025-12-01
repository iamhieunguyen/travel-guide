// components/PostMap.jsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

export default function PostMap({ lat, lng, locationName, imageUrl }) {
  if (!lat || !lng) return null;

  // Create custom icon with thumbnail image
  const customIcon = imageUrl ? L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        width: 50px;
        height: 62px;
      ">
        <div style="
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 3px solid #0891b2;
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
            onerror="this.src='https://placehold.co/50x50/0891b2/white?text=📍'"
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
          border-top: 12px solid #0891b2;
        "></div>
      </div>
    `,
    iconSize: [50, 62],
    iconAnchor: [25, 62],
    popupAnchor: [0, -62]
  }) : L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  return (
    <div className="w-full h-[250px] rounded-2xl overflow-hidden shadow-md relative z-0">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
        zoomControl={true}
        doubleClickZoom={true}
        touchZoom={true}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={customIcon}>
          {locationName && (
            <Popup>
              <div className="text-sm font-medium">{locationName}</div>
            </Popup>
          )}
        </Marker>
      </MapContainer>
    </div>
  );
}
