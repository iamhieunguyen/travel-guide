import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Calendar, 
  Plus,
  ArrowLeft,
  MoreHorizontal,
  Globe,
  Lock,
  LayoutGrid,
  Map
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCreatePostModal } from '../../contexts/CreatePostModalContext';
import api from '../../services/article';
import DateRangePicker from '../../components/DateRangePicker/DateRangePicker';
import MapView from '../../components/map/MapView';
import './PersonalPage.css';

export default function PersonalPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, authChecked } = useAuth(); // Thêm authChecked
  const { openModal, refreshKey } = useCreatePostModal();

  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState('grid');
  const [privacyFilter, setPrivacyFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null); 
  const [selectedMemory, setSelectedMemory] = useState(null);

  const journeyYears = useMemo(() => {
    if (memories.length === 0) return new Date().getFullYear();
    const years = memories.map(m => m.date.getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    return minYear === maxYear ? minYear : `${minYear} - ${maxYear}`;
  }, [memories]);

  // Chỉ redirect khi đã check auth xong xuôi mà vẫn không có user
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      navigate('/auth?mode=login');
    }
  }, [authChecked, isAuthenticated, navigate]);

  useEffect(() => {
    const fetchMemories = async () => {
      try {
        setLoading(true);
        
        // TẠM THỜI: Chỉ dùng logic lọc từ public vì backend scope='mine' chưa được deploy
        let myItems = [];
        
        // Lấy tất cả bài public
        const publicResponse = await api.listArticles({ 
          scope: 'public', 
          limit: 100, 
          useCache: false 
        });
        const publicItems = publicResponse.items || [];
        console.log('🌍 Public Items (all users):', publicItems.length, publicItems);
        
        // Helper function so sánh
        const compare = (val1, val2) => {
          if (!val1 || !val2) return false;
          return String(val1).trim().toLowerCase() === String(val2).trim().toLowerCase();
        };
        
        // Lọc CHỈ bài viết của user hiện tại
        myItems = publicItems.filter(item => {
          if (!user) return false;
          
          // Debug từng item
          const isMyPost = (
            compare(item.username, user.username) ||
            (user.attributes?.name && compare(item.username, user.attributes.name)) ||
            (user.attributes?.preferred_username && compare(item.username, user.attributes.preferred_username)) ||
            (item.ownerId && user.sub && compare(item.ownerId, user.sub)) ||
            (item.ownerId && compare(item.ownerId, user.username)) ||
            (item.ownerId && user['cognito:username'] && compare(item.ownerId, user['cognito:username']))
          );
          
          // Log để debug
          if (isMyPost) {
            console.log('✅ MY POST:', item.title, '| Username:', item.username, '| OwnerId:', item.ownerId);
          } else {
            console.log('❌ NOT MY POST:', item.title, '| Username:', item.username, '| OwnerId:', item.ownerId);
          }
          
          return isMyPost;
        });
        
        console.log('✅ Filtered MY Items:', myItems.length, myItems);
        console.log('👤 Current User Info:', {
          username: user.username,
          sub: user.sub,
          cognitoUsername: user['cognito:username'],
          attributesName: user.attributes?.name
        });

        // DEBUG: Log để xem data
        console.log('🔍 DEBUG Personal Page:');
        console.log('👤 Current User:', user);

        // Sort theo thời gian mới nhất
        const sortedItems = myItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        console.log('📊 Total Items:', sortedItems.length, sortedItems);

        const mapped = sortedItems.map(item => {
          // Xác định tên location (ưu tiên locationName từ backend)
          let locationName = "Unknown";
          if (item.locationName) {
            locationName = item.locationName;
          } else if (item.location && typeof item.location === 'string') {
            locationName = item.location;
          } else if (item.location && typeof item.location === 'object' && item.location.name) {
            locationName = item.location.name;
          }
          
          // Debug location để kiểm tra
          console.log('📍 Location Debug:', {
            title: item.title,
            locationName: item.locationName,
            location: item.location,
            finalName: locationName
          });
          
          return {
            id: item.articleId,
            image: item.imageKeys?.[0] ? api.buildImageUrlFromKey(item.imageKeys[0]) : (item.imageKey ? api.buildImageUrlFromKey(item.imageKey) : null),
            title: item.title || "Khoảnh khắc vô danh",
            description: item.content,
            location: {
              name: locationName,
              lat: item.lat || 0,
              lng: item.lng || 0
            },
            date: new Date(item.createdAt),
            scope: item.visibility || 'public'
          };
        });
        setMemories(mapped);
      } catch (error) {
        console.error("Error fetching memories:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchMemories();
  }, [user, refreshKey]);

  const filteredMemories = useMemo(() => {
    return memories.filter(m => {
      // 1. Filter Privacy
      const matchPrivacy = privacyFilter === 'all' || m.scope === privacyFilter;
      
      // 2. Filter Date (Tạm thời vô hiệu hóa logic so sánh ngày để debug hiển thị)
      // Chỉ cần có bài là hiện, bất chấp ngày tháng người dùng chọn
      // Logic cũ:
      /*
      let matchDate = true;
      if (dateRange?.from) { ... }
      if (matchDate && dateRange?.to) { ... }
      */
      const matchDate = true; // Force true

      return matchPrivacy && matchDate;
    });
  }, [memories, privacyFilter]);

  const formatDate = (date) => {
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="journal-page">
      <header className="journal-header">
        <div className="journal-cover">
          <div className="overlay-gradient"></div>
          <div className="header-controls">
            <button onClick={() => navigate('/home')} className="icon-btn glass">
              <ArrowLeft size={20} />
            </button>
            <button onClick={() => navigate('/settings')} className="icon-btn glass">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        <div className="journal-profile">
          <div className="avatar-container">
            {user?.picture ? (
              <img src={user.picture} alt="Avatar" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
            )}
          </div>
          
          <div className="profile-text">
            <h1 className="profile-name">{user?.name || user?.username}</h1>
            <p className="profile-bio">Lưu giữ những mảnh ghép của cuộc đời.</p>
            <div className="profile-meta">
              <span><strong>{memories.length}</strong> ký ức</span>
              <span className="dot">•</span>
              <span><strong>{journeyYears}</strong> hành trình</span>
            </div>
          </div>
        </div>
      </header>

      <div className="toolbar-sticky-wrapper">
        {/* DEBUG PANEL - Đã xóa */}
        <nav className="journal-toolbar">
          <div className="view-switcher">
            <button 
              className={`view-tab ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={18} />
              <span>Lưới ảnh</span>
            </button>
            <button 
              className={`view-tab ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
            >
              <Map size={18} />
              <span>Bản đồ</span>
            </button>
          </div>

          <div className="filter-group">
            <div className="privacy-pills">
              <button 
                className={`pill ${privacyFilter === 'all' ? 'active' : ''}`}
                onClick={() => setPrivacyFilter('all')}
              >
                Tất cả
              </button>
              <button 
                className={`pill ${privacyFilter === 'public' ? 'active' : ''}`}
                onClick={() => setPrivacyFilter('public')}
              >
                <Globe size={14} /> Công khai
              </button>
              <button 
                className={`pill ${privacyFilter === 'private' ? 'active' : ''}`}
                onClick={() => setPrivacyFilter('private')}
              >
                <Lock size={14} /> Riêng tư
              </button>
            </div>

            <div className="date-filter-wrapper">
              <DateRangePicker selected={dateRange} onSelect={setDateRange} />
            </div>
          </div>
        </nav>
      </div>

      <main className="memory-stream">
        {loading ? (
          <div className="loading-spinner">Đang tải ký ức...</div>
        ) : (
          <>
            {viewMode === 'grid' && filteredMemories.length === 0 ? (
              <div className="empty-journal">
                <div className="empty-icon">🍃</div>
                <p>Không tìm thấy ký ức nào phù hợp.</p>
                {(privacyFilter !== 'all' || dateRange) ? (
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <p className="text-sm text-gray-500">Có thể bài viết của bạn đang bị ẩn bởi bộ lọc?</p>
                    <button 
                      className="text-[#0891b2] hover:underline font-medium" 
                      onClick={() => {
                        setPrivacyFilter('all');
                        setDateRange(null);
                      }}
                    >
                      Xem tất cả bài viết
                    </button>
                  </div>
                ) : (
                  <button onClick={openModal}>Viết dòng nhật ký đầu tiên</button>
                )}
              </div>
            ) : (
              viewMode === 'grid' && (
                <div className="masonry-grid">
                  {filteredMemories.map((memory) => (
                    <div 
                      key={memory.id} 
                      className="journal-card"
                      onClick={() => setSelectedMemory(memory)}
                    >
                      {memory.image && (
                        <div className="card-image">
                          <img src={memory.image} alt={memory.title} loading="lazy" />
                          <div className="card-overlay">
                            <span className="privacy-tag">
                              {memory.scope === 'public' ? <Globe size={12} /> : <Lock size={12} />}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="card-body">
                        <div className="card-meta">
                          <span className="date">{formatDate(memory.date)}</span>
                          {memory.location && (
                            <span className="location">
                              <MapPin size={12} /> 
                              {typeof memory.location === 'object' ? memory.location.name : memory.location}
                            </span>
                          )}
                        </div>
                        <h3 className="card-title">{memory.title}</h3>
                        {memory.description && (
                          <p className="card-snippet">{memory.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {viewMode === 'map' && (
              <div className="map-view-container">
                {filteredMemories.length === 0 && (
                   <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 px-4 py-2 rounded-full shadow-md text-sm text-gray-500">
                     Không có địa điểm nào phù hợp bộ lọc
                   </div>
                )}
                <MapView 
                  locations={filteredMemories} 
                  onMarkerClick={(memory) => {
                    const fullMemory = memories.find(m => m.id === memory.id);
                    if(fullMemory) setSelectedMemory(fullMemory);
                  }}
                />
              </div>
            )}
          </>
        )}
      </main>

      {selectedMemory && (
        <div className="journal-modal-backdrop" onClick={() => setSelectedMemory(null)}>
          <div className="journal-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-scroll-content">
              {selectedMemory.image && (
                <div className="modal-img-container">
                  <img src={selectedMemory.image} alt="Full memory" />
                </div>
              )}
              <div className="modal-text-content">
                <div className="modal-top-bar">
                  <span className="modal-date"><Calendar size={14}/> {formatDate(selectedMemory.date)}</span>
                  <span className={`modal-privacy ${selectedMemory.scope}`}>
                    {selectedMemory.scope === 'public' ? <><Globe size={14}/> Công khai</> : <><Lock size={14}/> Riêng tư</>}
                  </span>
                </div>
                
                <h2 className="modal-title">{selectedMemory.title}</h2>
                
                {selectedMemory.location && (
                  <div className="modal-location">
                    <MapPin size={16} /> 
                    {typeof selectedMemory.location === 'object' 
                      ? selectedMemory.location.name 
                      : selectedMemory.location
                    }
                  </div>
                )}

                <div className="modal-body">
                  {selectedMemory.description || "Không có nội dung chi tiết..."}
                </div>
              </div>
            </div>
            <button className="close-modal-btn" onClick={() => setSelectedMemory(null)}>
              <Plus size={32} style={{transform: 'rotate(45deg)'}}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}