import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Image as ImageIcon,
  X,
  LogOut,
  User,
  Settings,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
  Lock,
  Globe,
  TrendingUp,
  Layers2Icon
} from 'lucide-react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { MapContainer, TileLayer, Marker as LeafletMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { isAuthenticated, signOut } from '../../services/cognito';
import { useCreatePostModal } from '../../context/CreatePostModalContext';
import { mockMemories, mockSharedMemories } from './mockData';
import DateRangePicker from './components/DateRangePicker/DateRangePicker';
import { useScrollAnimation } from './components/useScrollAnimation';
import './HomePage.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function HomePage() {
  const navigate = useNavigate();
  const { openModal } = useCreatePostModal();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'public', 'private', 'shared'
  const [filterDateRange, setFilterDateRange] = useState(undefined); // DateRange object from react-day-picker
  const [memories] = useState(mockMemories);
  const [sharedMemories] = useState(mockSharedMemories);
  
  // Scroll animation for sidebar
  useScrollAnimation();
  
  const [hoveredMarker, setHoveredMarker] = useState(null);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' or 'memories'
  
  const mapCenter = useMemo(() => ({ lat: 15.4549, lng: 107.6180 }), []); // Trung tâm Việt Nam
  const mapZoom = 6;
  const [infoWindowOpen, setInfoWindowOpen] = useState(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth?mode=login');
    }
  }, [navigate]);

  useEffect(() => {
    // Intersection Observer for fade-in animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.fade-in-section');
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  // Kết hợp memories của tôi và shared memories
  const allMemories = useMemo(() => {
    const myMemories = memories.map(m => ({ ...m, isShared: false }));
    const shared = sharedMemories.map(m => ({ ...m, isShared: true }));
    return [...myMemories, ...shared];
  }, [memories, sharedMemories]);

  // Lọc ký ức theo search, status, date, type
  const filteredMemories = allMemories.filter(memory => {
    const matchesSearch = memory.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         memory.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'shared' && memory.isShared) ||
                         (filterStatus !== 'shared' && !memory.isShared && memory.status === filterStatus);
    
    // Kiểm tra date range
    let matchesDate = true;
    if (filterDateRange?.from) {
      const memoryDate = new Date(memory.date);
      const fromDate = filterDateRange.from;
      const toDate = filterDateRange.to || filterDateRange.from;
      
      // Reset time to start of day for comparison
      const memoryDateOnly = new Date(memoryDate.getFullYear(), memoryDate.getMonth(), memoryDate.getDate());
      const fromDateOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      const toDateOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      
      matchesDate = memoryDateOnly >= fromDateOnly && memoryDateOnly <= toDateOnly;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Trigger lại observer khi tab thay đổi hoặc danh sách memories thay đổi
  useEffect(() => {
    // Đợi DOM update xong, sau đó trigger lại observer
    // KHÔNG force hiển thị - để observer tự động detect khi scroll
    setTimeout(() => {
      // Dispatch custom event để trigger lại observer
      window.dispatchEvent(new Event('refresh-scroll-animation'));
    }, 350);
  }, [activeTab, filteredMemories.length]);

  // Format date để hiển thị
  const formatDate = (dateString, timeString) => {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return `${date.toLocaleDateString('vi-VN', options)} lúc ${timeString}`;
  };

  // Lấy số liệu thống kê từ filtered memories
  const stats = {
    totalLocations: filteredMemories.length,
    totalMemories: filteredMemories.reduce((sum, m) => sum + m.images.length, 0),
    publicMemories: filteredMemories.filter(m => !m.isShared && m.status === 'public').length,
    privateMemories: filteredMemories.filter(m => !m.isShared && m.status === 'private').length,
    sharedMemories: filteredMemories.filter(m => m.isShared).length,
    myMemories: filteredMemories.filter(m => !m.isShared).length,
  };

  // Map options
  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    clickableIcons: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: false,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  }), []);

  // Google Maps API key
  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY?.trim() || '';
  const useOpenStreetMap = true; // Set to true to use OpenStreetMap, false for Google Maps

  // Helper function to create Leaflet marker icon
  const createLeafletIcon = (isActive, isShared = false) => {
    const fillColor = isShared ? '#a855f7' : '#06b6d4';
    const strokeColor = isShared ? '#9333ea' : '#0891b2';
    const size = isActive ? 40 : 32;
    
    const iconHtml = `
      <svg width="${size}" height="${size + 10}" viewBox="0 0 ${size} ${size + 10}" xmlns="http://www.w3.org/2000/svg">
        <path d="M${size/2} 0C${size * 0.45} 0 0 ${size * 0.45} 0 ${size/2}c0 ${size * 0.75} ${size/2} ${size * 1.5} ${size/2} ${size * 1.5}s${size/2}-${size * 0.75} ${size/2}-${size * 1.5}C${size} ${size * 0.45} ${size * 0.55} 0 ${size/2} 0z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>
        <circle cx="${size/2}" cy="${size/2}" r="${size * 0.2}" fill="#fff"/>
        ${isShared ? `<circle cx="${size/2}" cy="${size/2}" r="${size * 0.1}" fill="${fillColor}"/>` : ''}
      </svg>
    `;
    
    return L.divIcon({
      html: iconHtml,
      className: 'custom-leaflet-marker',
      iconSize: [size, size + 10],
      iconAnchor: [size/2, size + 10],
    });
  };

  // Helper function to create marker icon for Google Maps
  const createMarkerIcon = (isActive, isShared = false) => {
    if (!window.google?.maps) return undefined;
    
    // Màu cho pin của tôi (cyan) và pin được chia sẻ (purple)
    const fillColor = isShared ? '#a855f7' : '#06b6d4';
    const strokeColor = isShared ? '#9333ea' : '#0891b2';
    
    const url = isActive
      ? 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 0C9 0 0 9 0 20c0 15 20 30 20 30s20-15 20-30C40 9 31 0 20 0z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>
            <circle cx="20" cy="20" r="8" fill="#fff"/>
            ${isShared ? '<circle cx="20" cy="20" r="4" fill="' + fillColor + '"/>' : ''}
          </svg>
        `)
      : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>
            <circle cx="16" cy="16" r="6" fill="#fff"/>
            ${isShared ? '<circle cx="16" cy="16" r="3" fill="' + fillColor + '"/>' : ''}
          </svg>
        `);
    
    return {
      url,
      scaledSize: isActive 
        ? new window.google.maps.Size(40, 50)
        : new window.google.maps.Size(32, 40),
      anchor: new window.google.maps.Point(
        isActive ? 20 : 16,
        isActive ? 50 : 40
      )
    };
  };

  return (
    <div className="homepage-fullmap">
      {/* Floating Header */}
      <header className="floating-header">
        <div className="header-left">
          <button 
            className="sidebar-toggle left"
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="logo-section">
            <MapIcon className="w-6 h-6 text-[#06b6d4]" strokeWidth={2} />
            <span className="logo-text">MemoryMap</span>
          </div>
        </div>

        <div className="header-center">
          <div className="search-bar-floating">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm ký ức, địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="header-right">
          <div className="user-menu-container">
            <button 
              className="user-avatar-btn"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <User className="w-5 h-5" />
            </button>
            
            {isUserMenuOpen && (
              <div className="user-dropdown">
                <button 
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    navigate('/personal');
                  }}
                  aria-label="Hồ sơ"
                >
                  <User className="w-4 h-4" />
                  Hồ sơ
                </button>
                <button 
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    navigate('/settings');
                  }}
                  aria-label="Cài đặt"
                >
                  <Settings className="w-4 h-4" />
                  Cài đặt
                </button>
                <div className="dropdown-divider" />
                <button 
                  type="button"
                  className="dropdown-item" 
                  onClick={handleLogout}
                  aria-label="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Fullscreen Map */}
      <div className="fullscreen-map">
        <div className="map-container-full">
          {useOpenStreetMap ? (
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredMemories.map((memory) => (
                <LeafletMarker
                  key={memory.id}
                  position={[memory.coordinates.lat, memory.coordinates.lng]}
                  icon={createLeafletIcon(selectedMemory?.id === memory.id, memory.isShared)}
                  eventHandlers={{
                    click: () => {
                      setSelectedMemory(memory);
                      setInfoWindowOpen(memory.id);
                    },
                  }}
                >
                  {infoWindowOpen === memory.id && (
                    <Popup
                      onClose={() => setInfoWindowOpen(null)}
                      className="custom-popup"
                    >
                      <div className="google-info-window">
                        <div 
                          className="info-window-image"
                          style={{ backgroundImage: `url(${memory.images[0]})` }}
                        />
                        <div className="info-window-content">
                          {memory.isShared && (
                            <div className="info-window-shared-badge">
                              <User className="w-3 h-3" />
                              <span>Chia sẻ bởi {memory.sharedBy}</span>
                            </div>
                          )}
                          <div className="info-window-title">{memory.title}</div>
                          <div className="info-window-location">
                            <MapPin className="w-3 h-3" />
                            {memory.location}
                          </div>
                          <div className="info-window-status">
                            {memory.isShared ? (
                              <><User className="w-3 h-3" /> Được chia sẻ</>
                            ) : memory.status === 'public' ? (
                              <><Globe className="w-3 h-3" /> Công khai</>
                            ) : (
                              <><Lock className="w-3 h-3" /> Riêng tư</>
                            )}
                          </div>
                        </div>
                      </div>
                    </Popup>
                  )}
                </LeafletMarker>
              ))}
            </MapContainer>
          ) : googleMapsApiKey ? (
            <LoadScript 
              googleMapsApiKey={googleMapsApiKey}
              loadingElement={<div className="map-loading">Đang tải bản đồ...</div>}
              onError={(error) => {
                console.error('Google Maps loading error:', error);
              }}
            >
              <GoogleMap
                mapContainerClassName="google-map-container"
                center={mapCenter}
                zoom={mapZoom}
                options={mapOptions}
                onLoad={(map) => {
                  console.log('Google Map loaded successfully');
                }}
                onError={(error) => {
                  console.error('Google Map error:', error);
                }}
              >
                {/* Map Markers */}
                {filteredMemories.map((memory) => (
                  <React.Fragment key={memory.id}>
                    <Marker
                      position={{ lat: memory.coordinates.lat, lng: memory.coordinates.lng }}
                      onClick={() => {
                        setSelectedMemory(memory);
                        setInfoWindowOpen(memory.id);
                      }}
                      icon={createMarkerIcon(selectedMemory?.id === memory.id, memory.isShared)}
                    />
                    {infoWindowOpen === memory.id && (
                      <InfoWindow
                        position={{ lat: memory.coordinates.lat, lng: memory.coordinates.lng }}
                        onCloseClick={() => setInfoWindowOpen(null)}
                      >
                        <div className="google-info-window">
                          <div 
                            className="info-window-image"
                            style={{ backgroundImage: `url(${memory.images[0]})` }}
                          />
                          <div className="info-window-content">
                            {memory.isShared && (
                              <div className="info-window-shared-badge">
                                <User className="w-3 h-3" />
                                <span>Chia sẻ bởi {memory.sharedBy}</span>
                              </div>
                            )}
                            <div className="info-window-title">{memory.title}</div>
                            <div className="info-window-location">
                              <MapPin className="w-3 h-3" />
                              {memory.location}
                            </div>
                            <div className="info-window-status">
                              {memory.isShared ? (
                                <><User className="w-3 h-3" /> Được chia sẻ</>
                              ) : memory.status === 'public' ? (
                                <><Globe className="w-3 h-3" /> Công khai</>
                              ) : (
                                <><Lock className="w-3 h-3" /> Riêng tư</>
                              )}
                            </div>
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </React.Fragment>
                ))}
              </GoogleMap>
            </LoadScript>
          ) : (
            <div className="map-placeholder-full">
              <div className="map-watermark">
                <MapIcon className="map-watermark-icon" />
                <p>Bản đồ ký ức của bạn</p>
                <p className="text-sm text-gray-500 mt-2">
                  Vui lòng thêm REACT_APP_GOOGLE_MAPS_API_KEY vào file .env
                </p>
              </div>
              
              {/* Fallback Markers */}
              <div className="mock-markers">
                {filteredMemories.map((memory, index) => (
                  <div 
                    key={memory.id}
                    className={`map-marker-full ${selectedMemory?.id === memory.id ? 'active' : ''}`}
                    style={{
                      top: memory.coordinates.top,
                      left: memory.coordinates.left
                    }}
                    onMouseEnter={() => setHoveredMarker(memory.id)}
                    onMouseLeave={() => setHoveredMarker(null)}
                    onClick={() => setSelectedMemory(memory)}
                  >
                    <MapPin 
                      className={`marker-icon-full ${memory.isShared ? 'shared-marker' : ''}`}
                      style={{ color: memory.isShared ? '#a855f7' : '#06b6d4' }}
                    />
                    {hoveredMarker === memory.id && (
                      <div className="marker-tooltip-full">
                        <div className="tooltip-image" style={{ backgroundImage: `url(${memory.images[0]})` }} />
                        <div className="tooltip-content">
                          {memory.isShared && (
                            <div className="tooltip-shared-badge">
                              <User className="w-3 h-3" />
                              <span>Chia sẻ bởi {memory.sharedBy}</span>
                            </div>
                          )}
                          <div className="tooltip-title">{memory.title}</div>
                          <div className="tooltip-location">
                            <MapPin className="w-3 h-3" />
                            {memory.location}
                          </div>
                          <div className="tooltip-status">
                            {memory.isShared ? (
                              <><User className="w-3 h-3" /> Được chia sẻ</>
                            ) : memory.status === 'public' ? (
                              <><Globe className="w-3 h-3" /> Công khai</>
                            ) : (
                              <><Lock className="w-3 h-3" /> Riêng tư</>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Left Sidebar - Stats & Filters */}
      <aside className={`sidebar-overlay left ${isLeftSidebarOpen ? 'open' : 'closed'}`}>
        <button 
          className="sidebar-collapse-btn"
          onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        >
          {isLeftSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        
        <div className="sidebar-content">
          {/* Tab Navigation */}
          <div className="sidebar-tabs">
            <button 
              className={`sidebar-tab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <TrendingUp className="w-4 h-4" />
              Thống kê
            </button>
            <button 
              className={`sidebar-tab ${activeTab === 'memories' ? 'active' : ''}`}
              onClick={() => setActiveTab('memories')}
            >
              <ImageIcon className="w-4 h-4" />
              Ký ức của bạn
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'stats' && (
              <>
                <div className="stats-section">
                  <div className="stats-grid-overlay">
                    <div className="stat-card-overlay animate-on-scroll">
                      <div className="stat-icon orange">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="stat-info">
                        <div className="stat-value">{stats.totalLocations}</div>
                        <div className="stat-label">Địa điểm</div>
                      </div>
                    </div>
                    
                    <div className="stat-card-overlay animate-on-scroll">
                      <div className="stat-icon pink">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div className="stat-info">
                        <div className="stat-value">{stats.totalMemories}</div>
                        <div className="stat-label">Ảnh</div>
                      </div>
                    </div>
                    
                    <div className="stat-card-overlay animate-on-scroll">
                      <div className="stat-icon purple">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div className="stat-info">
                        <div className="stat-value">{stats.publicMemories}</div>
                        <div className="stat-label">Công khai</div>
                      </div>
                    </div>
                    
                    <div className="stat-card-overlay animate-on-scroll">
                      <div className="stat-icon yellow">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div className="stat-info">
                        <div className="stat-value">{stats.privateMemories}</div>
                        <div className="stat-label">Riêng tư</div>
                      </div>
                    </div>
                    
                    <div className="stat-card-overlay animate-on-scroll">
                      <div className="stat-icon pink">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="stat-info">
                        <div className="stat-value">{stats.sharedMemories}</div>
                        <div className="stat-label">Được chia sẻ</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="filter-section-overlay animate-on-scroll">
                  <h3 className="section-title-overlay">
                    <Filter className="w-4 h-4" />
                    Bộ lọc
                  </h3>
                  
                  {/* Filter by Status */}
                  <div className="filter-group">
                    <label className="filter-label">Trạng thái</label>
                    <div className="filter-buttons">
                      <button 
                        className={`filter-btn-overlay ${filterStatus === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('all')}
                      >
                        <Layers2Icon className="w-4 h-4" />
                        Tất cả
                      </button>
                      <button 
                        className={`filter-btn-overlay ${filterStatus === 'public' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('public')}
                      >
                        <Globe className="w-4 h-4" />
                        Công khai
                      </button>
                      <button 
                        className={`filter-btn-overlay ${filterStatus === 'private' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('private')}
                      >
                        <Lock className="w-4 h-4" />
                        Riêng tư
                      </button>
                      <button 
                        className={`filter-btn-overlay ${filterStatus === 'shared' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('shared')}
                      >
                        <User className="w-4 h-4" />
                        Chia sẻ
                      </button>
                    </div>
                  </div>

                  {/* Filter by Date */}
                  <div className="filter-group">
                    <label className="filter-label">Khoảng thời gian</label>
                    <DateRangePicker
                      selected={filterDateRange}
                      onSelect={setFilterDateRange}
                    />
                  </div>

                </div>
              </>
            )}

            {activeTab === 'memories' && (
              <div className="memories-section-overlay">
                <div className="memories-header-overlay">
                  <span className="memory-count-overlay">{filteredMemories.length} ký ức</span>
                </div>

                <div className="memories-list-overlay">
                  {filteredMemories.map((memory, index) => (
                    <div 
                      key={memory.id} 
                      className={`memory-item-overlay animate-on-scroll ${selectedMemory?.id === memory.id ? 'active' : ''}`}
                      onClick={() => setSelectedMemory(memory)}
                      style={{ transitionDelay: `${index * 50}ms` }}
                    >
                      <div 
                        className="memory-thumbnail-overlay"
                        style={{ backgroundImage: `url(${memory.images[0]})` }}
                      />
                      <div className="memory-details-overlay">
                        <div className="memory-header-overlay">
                          <h4 className="memory-title-overlay">{memory.title}</h4>
                          {memory.isShared ? (
                            <div className="memory-shared-badge">
                              <User className="w-4 h-4 text-purple-500" />
                            </div>
                          ) : memory.status === 'public' ? (
                            <Globe className="w-4 h-4 text-green-500" />
                          ) : (
                            <Lock className="w-4 h-4 text-[#06b6d4]" />
                          )}
                        </div>
                        {memory.isShared && (
                          <div className="memory-shared-by">
                            <User className="w-3 h-3" />
                            <span>Chia sẻ bởi {memory.sharedBy}</span>
                          </div>
                        )}
                        <div className="memory-location-overlay">
                          <MapPin className="w-3 h-3" />
                          <span>{memory.location}</span>
                        </div>
                        <div className="memory-date-overlay">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(memory.date, memory.time)}</span>
                        </div>
                        <div className="memory-images-count">
                          <ImageIcon className="w-3 h-3" />
                          <span>{memory.images.length} ảnh</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Floating Add Button */}
      <button 
        className="floating-add-btn-main"
        onClick={openModal}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <div className="modal-overlay" onClick={() => setSelectedMemory(null)}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{selectedMemory.title}</h2>
                {selectedMemory.isShared && (
                  <div className="modal-shared-badge">
                    <User className="w-4 h-4" />
                    <span>Chia sẻ bởi {selectedMemory.sharedBy}</span>
                  </div>
                )}
                <div className="modal-subtitle">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedMemory.location}</span>
                </div>
              </div>
              <button 
                className="modal-close"
                onClick={() => setSelectedMemory(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="detail-content">
              {/* Image Gallery */}
              <div className="detail-image-gallery">
                {selectedMemory.images.map((image, index) => (
                  <div 
                    key={index}
                    className="detail-image-item"
                    style={{ backgroundImage: `url(${image})` }}
                  />
                ))}
              </div>
              
              <div className="detail-info">
                {/* Status and Date */}
                <div className="detail-meta">
                  <div className="meta-item status-badge">
                    {selectedMemory.isShared ? (
                      <>
                        <User className="w-4 h-4" />
                        <span>Được chia sẻ</span>
                      </>
                    ) : selectedMemory.status === 'public' ? (
                      <>
                        <Globe className="w-4 h-4" />
                        <span>Công khai</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Riêng tư</span>
                      </>
                    )}
                  </div>
                  <div className="meta-item">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(selectedMemory.date, selectedMemory.time)}</span>
                  </div>
                  <div className="meta-item">
                    <ImageIcon className="w-4 h-4" />
                    <span>{selectedMemory.images.length} ảnh</span>
                  </div>
                </div>

                {/* Description */}
                <div className="detail-description">
                  <h3>Mô tả</h3>
                  <p>{selectedMemory.description}</p>
                </div>

                {/* Mood and Weather */}
                <div className="detail-tags">
                  <div className="tag-item">
                    <span className="tag-label">Cảm xúc:</span>
                    <span className="tag-value">{selectedMemory.mood}</span>
                  </div>
                  <div className="tag-item">
                    <span className="tag-label">Thời tiết:</span>
                    <span className="tag-value">{selectedMemory.weather}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
