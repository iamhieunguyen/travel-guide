import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Search, 
  Calendar, 
  Image as ImageIcon,
  X,
  User,
  Lock,
  Globe,
  Clock
} from 'lucide-react';
import { isAuthenticated } from '../../services/cognito';
import { mockMemories } from '../HomePage/mockData';
import DateRangePicker from './components/DateRangePicker/DateRangePicker';
import BackButton from './components/BackButton';
import StatusFilterDropdown from './components/StatusFilterDropdown';
import { useScrollAnimation } from './components/useScrollAnimation';
import './PersonalPage.css';

export default function PersonalPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'public', 'private'
  const [dateRange, setDateRange] = useState(undefined);
  const [memories] = useState(mockMemories);

  // Scroll animation
  useScrollAnimation();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth?mode=login');
    }
  }, [navigate]);

  // Lọc ký ức theo search, status, date (chỉ hiển thị memories của user, không có shared)
  const filteredMemories = useMemo(() => {
    return memories.filter(memory => {
      const matchesSearch = memory.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           memory.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || memory.status === filterStatus;
      
      // Kiểm tra date range
      let matchesDate = true;
      if (dateRange?.from) {
        const memoryDate = new Date(memory.date);
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          matchesDate = memoryDate >= fromDate && memoryDate <= toDate;
        } else {
          // Chỉ chọn from date
          const fromDateEnd = new Date(fromDate);
          fromDateEnd.setHours(23, 59, 59, 999);
          matchesDate = memoryDate >= fromDate && memoryDate <= fromDateEnd;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [memories, searchQuery, filterStatus, dateRange]);

  // Tính toán stats
  const stats = useMemo(() => {
    return {
      totalMemories: filteredMemories.length,
      totalImages: filteredMemories.reduce((sum, m) => sum + m.images.length, 0),
      publicMemories: filteredMemories.filter(m => m.status === 'public').length,
      privateMemories: filteredMemories.filter(m => m.status === 'private').length,
    };
  }, [filteredMemories]);


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="personal-page">
      {/* Header */}
      <header className="personal-header">
        <div className="header-content">
          <BackButton onClick={() => navigate('/home')} />

          <div className="header-title">
            <div className="header-title-icon">
              <User className="w-6 h-6" />
            </div>
            <div className="header-title-text">
              <h1>Trang cá nhân</h1>
              <p className="header-subtitle">Quản lý ký ức của bạn</p>
            </div>
          </div>

          <div className="header-spacer"></div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card animate-on-scroll">
            <div className="stat-icon blue">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.totalMemories}</div>
              <div className="stat-label">Tổng ký ức</div>
            </div>
          </div>

          <div className="stat-card animate-on-scroll">
            <div className="stat-icon cyan">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.totalImages}</div>
              <div className="stat-label">Tổng hình ảnh</div>
            </div>
          </div>

          <div className="stat-card animate-on-scroll">
            <div className="stat-icon green">
              <Globe className="w-6 h-6" />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.publicMemories}</div>
              <div className="stat-label">Công khai</div>
            </div>
          </div>

          <div className="stat-card animate-on-scroll">
            <div className="stat-icon orange">
              <Lock className="w-6 h-6" />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.privateMemories}</div>
              <div className="stat-label">Riêng tư</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="filters-section animate-on-scroll">
        <div className="search-bar">
          <Search className="w-5 h-5 search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm ký ức, địa điểm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label className="filter-label">Trạng thái</label>
            <StatusFilterDropdown 
              value={filterStatus} 
              onChange={setFilterStatus} 
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Khoảng thời gian</label>
            <DateRangePicker
              selected={dateRange}
              onSelect={setDateRange}
            />
          </div>
        </div>
      </section>

      {/* Memories Grid */}
      <section className="memories-section">
        <div className="memories-grid">
          {filteredMemories.length === 0 ? (
            <div className="empty-state">
              <ImageIcon className="w-16 h-16" />
              <p>Không tìm thấy ký ức nào</p>
            </div>
          ) : (
            filteredMemories.map((memory, index) => (
              <div 
                key={memory.id} 
                className="memory-card animate-on-scroll"
                onClick={() => setSelectedMemory(memory)}
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <div className="memory-image-container">
                  <img 
                    src={memory.images[0]} 
                    alt={memory.title}
                    className="memory-image"
                  />
                  <div className={`memory-status-badge ${memory.status}`}>
                    {memory.status === 'public' ? (
                      <Globe className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>
                  {memory.images.length > 1 && (
                    <div className="memory-image-count">
                      <ImageIcon className="w-4 h-4" />
                      <span>{memory.images.length}</span>
                    </div>
                  )}
                </div>
                
                <div className="memory-content">
                  <h3 className="memory-title">{memory.title}</h3>
                  <div className="memory-location">
                    <MapPin className="w-4 h-4" />
                    <span>{memory.location}</span>
                  </div>
                  <div className="memory-date">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(memory.date)} • {memory.time}</span>
                  </div>
                  {memory.description && (
                    <p className="memory-description">{memory.description}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Memory Detail Modal */}
      {selectedMemory && (
        <div 
          className="memory-modal-overlay"
          onClick={() => setSelectedMemory(null)}
        >
          <div 
            className="memory-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="modal-close-btn"
              onClick={() => setSelectedMemory(null)}
            >
              <X className="w-6 h-6" />
            </button>

            <div className="modal-header">
              <h2>{selectedMemory.title}</h2>
              <div className={`modal-status-badge ${selectedMemory.status}`}>
                {selectedMemory.status === 'public' ? (
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
            </div>

            <div className="modal-images">
              {selectedMemory.images.map((img, idx) => (
                <img 
                  key={idx} 
                  src={img} 
                  alt={`${selectedMemory.title} ${idx + 1}`}
                  className="modal-image"
                />
              ))}
            </div>

            <div className="modal-content">
              <div className="modal-info-row">
                <div className="modal-info-item">
                  <MapPin className="w-5 h-5" />
                  <span>{selectedMemory.location}</span>
                </div>
                <div className="modal-info-item">
                  <Calendar className="w-5 h-5" />
                  <span>{formatDate(selectedMemory.date)} • {selectedMemory.time}</span>
                </div>
              </div>

              {selectedMemory.description && (
                <div className="modal-description">
                  <p>{selectedMemory.description}</p>
                </div>
              )}

              <div className="modal-meta">
                {selectedMemory.mood && (
                  <div className="meta-item">
                    <span className="meta-label">Tâm trạng:</span>
                    <span className="meta-value">{selectedMemory.mood}</span>
                  </div>
                )}
                {selectedMemory.weather && (
                  <div className="meta-item">
                    <span className="meta-label">Thời tiết:</span>
                    <span className="meta-value">{selectedMemory.weather}</span>
                  </div>
                )}
                {selectedMemory.category && (
                  <div className="meta-item">
                    <span className="meta-label">Danh mục:</span>
                    <span className="meta-value">{selectedMemory.category}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

