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
import { useAuth } from '../../hook/useAuth';
import { useCreatePostModal } from '../../context/CreatePostModalContext';
import api from '../../services/article';
import DateRangePicker from '../../components/DateRangePicker/DateRangePicker';
import MapView from '../../components/map/MapView';
import './PersonalPage.css';

export default function PersonalPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, authChecked } = useAuth(); // Th├¬m authChecked
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

  // Chß╗ë redirect khi ─æ├ú check auth xong xu├┤i m├á vß║½n kh├┤ng c├│ user
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      navigate('/auth?mode=login');
    }
  }, [authChecked, isAuthenticated, navigate]);

  useEffect(() => {
    const fetchMemories = async () => {
      try {
        setLoading(true);
        
        // Lß║Ñy tß║Ñt cß║ú b├ái viß║┐t cß╗ºa user (public + private)
        let myItems = [];
        
        // Sß╗¡ dß╗Ñng scope='mine' ─æß╗â lß║Ñy cß║ú public v├á private
        const myResponse = await api.listArticles({ 
          scope: 'mine', 
          limit: 20, 
          useCache: false 
        });
        myItems = myResponse.items || [];
        
        // Debug only in development
        if (process.env.NODE_ENV === 'development') {
          console.log('≡ƒô¥ My Items:', myItems.length);
        }

        // Sort theo thß╗¥i gian mß╗¢i nhß║Ñt (backend ─æ├ú sort rß╗ôi, nh╞░ng sort lß║íi cho chß║»c)
        const sortedItems = myItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const mapped = sortedItems.map(item => {
          // X├íc ─æß╗ïnh t├¬n location (╞░u ti├¬n locationName tß╗½ backend)
          let locationName = "Unknown";
          if (item.locationName) {
            locationName = item.locationName;
          } else if (item.location && typeof item.location === 'string') {
            locationName = item.location;
          } else if (item.location && typeof item.location === 'object' && item.location.name) {
            locationName = item.location.name;
          }
          
          return {
            id: item.articleId,
            image: item.imageKeys?.[0] ? api.buildImageUrlFromKey(item.imageKeys[0]) : (item.imageKey ? api.buildImageUrlFromKey(item.imageKey) : null),
            title: item.title || "Khoß║únh khß║»c v├┤ danh",
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
      
      // 2. Filter Date (Tß║ím thß╗¥i v├┤ hiß╗çu h├│a logic so s├ính ng├áy ─æß╗â debug hiß╗ân thß╗ï)
      // Chß╗ë cß║ºn c├│ b├ái l├á hiß╗çn, bß║Ñt chß║Ñp ng├áy th├íng ng╞░ß╗¥i d├╣ng chß╗ìn
      // Logic c┼⌐:
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
            <p className="profile-bio">L╞░u giß╗» nhß╗»ng mß║únh gh├⌐p cß╗ºa cuß╗Öc ─æß╗¥i.</p>
            <div className="profile-meta">
              <span><strong>{memories.length}</strong> k├╜ ß╗⌐c</span>
              <span className="dot">ΓÇó</span>
              <span><strong>{journeyYears}</strong> h├ánh tr├¼nh</span>
            </div>
          </div>
        </div>
      </header>

      <div className="toolbar-sticky-wrapper">
        {/* DEBUG PANEL - ─É├ú x├│a */}
        <nav className="journal-toolbar">
          <div className="view-switcher">
            <button 
              className={`view-tab ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={18} />
              <span>L╞░ß╗¢i ß║únh</span>
            </button>
            <button 
              className={`view-tab ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
            >
              <Map size={18} />
              <span>Bß║ún ─æß╗ô</span>
            </button>
          </div>

          <div className="filter-group">
            <div className="privacy-pills">
              <button 
                className={`pill ${privacyFilter === 'all' ? 'active' : ''}`}
                onClick={() => setPrivacyFilter('all')}
              >
                Tß║Ñt cß║ú
              </button>
              <button 
                className={`pill ${privacyFilter === 'public' ? 'active' : ''}`}
                onClick={() => setPrivacyFilter('public')}
              >
                <Globe size={14} /> C├┤ng khai
              </button>
              <button 
                className={`pill ${privacyFilter === 'private' ? 'active' : ''}`}
                onClick={() => setPrivacyFilter('private')}
              >
                <Lock size={14} /> Ri├¬ng t╞░
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
          <div className="loading-spinner">─Éang tß║úi k├╜ ß╗⌐c...</div>
        ) : (
          <>
            {viewMode === 'grid' && filteredMemories.length === 0 ? (
              <div className="empty-journal">
                <div className="empty-icon">≡ƒìâ</div>
                <p>Kh├┤ng t├¼m thß║Ñy k├╜ ß╗⌐c n├áo ph├╣ hß╗úp.</p>
                {(privacyFilter !== 'all' || dateRange) ? (
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <p className="text-sm text-gray-500">C├│ thß╗â b├ái viß║┐t cß╗ºa bß║ín ─æang bß╗ï ß║⌐n bß╗ƒi bß╗Ö lß╗ìc?</p>
                    <button 
                      className="text-[#0891b2] hover:underline font-medium" 
                      onClick={() => {
                        setPrivacyFilter('all');
                        setDateRange(null);
                      }}
                    >
                      Xem tß║Ñt cß║ú b├ái viß║┐t
                    </button>
                  </div>
                ) : (
                  <button onClick={openModal}>Viß║┐t d├▓ng nhß║¡t k├╜ ─æß║ºu ti├¬n</button>
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
                     Kh├┤ng c├│ ─æß╗ïa ─æiß╗âm n├áo ph├╣ hß╗úp bß╗Ö lß╗ìc
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
                    {selectedMemory.scope === 'public' ? <><Globe size={14}/> C├┤ng khai</> : <><Lock size={14}/> Ri├¬ng t╞░</>}
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
                  {selectedMemory.description || "Kh├┤ng c├│ nß╗Öi dung chi tiß║┐t..."}
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
