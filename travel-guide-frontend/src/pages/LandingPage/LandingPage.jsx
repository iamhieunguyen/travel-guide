import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Map, 
  Compass, 
  Shield, 
  Camera, 
  ArrowRight, 
  Leaf,
  MapPin,
  Users,
  Globe,
  Heart,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import './LandingPage.css';
import { useScrollAnimation } from './useScrollAnimation';

export default function LandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  useScrollAnimation(); // Kích hoạt scroll animations

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div id="landing-page-wrapper">
      {/* Map-like Background Effects */}
      <div className="map-background">
        {/* Grid lines (latitude/longitude) */}
        <div className="map-grid"></div>
        
        {/* Map pins scattered around */}
        <div className="map-pin map-pin-1"></div>
        <div className="map-pin map-pin-2"></div>
        <div className="map-pin map-pin-3"></div>
        <div className="map-pin map-pin-4"></div>
        <div className="map-pin map-pin-5"></div>
        <div className="map-pin map-pin-6"></div>
        <div className="map-pin map-pin-7"></div>
        <div className="map-pin map-pin-8"></div>
        
        {/* Route lines connecting pins */}
        <svg className="map-routes" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <path className="route-line route-1" d="M150,200 Q300,150 450,180 T750,200" />
          <path className="route-line route-2" d="M200,400 Q400,350 600,380 T900,400" />
          <path className="route-line route-3" d="M100,500 L300,450 L500,480 L700,460" />
        </svg>
        
        {/* Location markers */}
        <div className="map-marker marker-1">
          <MapPin size={20} />
        </div>
        <div className="map-marker marker-2">
          <MapPin size={18} />
        </div>
        <div className="map-marker marker-3">
          <MapPin size={22} />
        </div>
        <div className="map-marker marker-4">
          <MapPin size={19} />
        </div>
        
        {/* Compass rose */}
        <div className="compass-rose">
          <Compass size={40} />
        </div>
        
        {/* Subtle water/land texture */}
        <div className="map-texture"></div>
      </div>
      
      {/* Background blobs for depth */}
      <div className="lp-blob lp-blob-1"></div>
      <div className="lp-blob lp-blob-2"></div>

      {/* Navigation */}
      <nav className="lp-nav">
        <div className="lp-brand" onClick={() => navigate('/')}>
          <Leaf size={32} strokeWidth={2.5} />
          <span>MemoryMap</span>
        </div>
        
        <div className="lp-nav-actions">
          <button 
            className="lp-btn lp-btn-ghost"
            onClick={() => navigate('/auth?mode=login')}
          >
            Đăng nhập
          </button>
          <button 
            className="lp-btn lp-btn-primary"
            onClick={() => navigate('/auth?mode=signup')}
          >
            Đăng ký ngay
          </button>
        </div>
      </nav>

      {/* Hero Section - Thiết kế mới hoàn toàn */}
      <header className="lp-hero">
        <div className="hero-main-container">
          {/* Left Side - Content */}
          <div className="hero-content-wrapper scroll-fade-in">
          <div className="lp-badge">
            <Compass size={18} className="text-teal-600" />
            <span>Khám phá & Lưu giữ hành trình</span>
          </div>
          
          <h1 className="lp-title">
            Lưu giữ từng <span className="lp-highlight">khoảnh khắc</span><br className="desktop-br"/>
            trên bản đồ cuộc đời
          </h1>
          
          <p className="lp-desc">
            Không chỉ là những bức ảnh, đó là những câu chuyện. 
            Tạo bản đồ ký ức của riêng bạn, đánh dấu những nơi đã đi qua và chia sẻ niềm đam mê xê dịch.
          </p>

          <div className="lp-cta-group">
            <button 
              className="lp-btn lp-btn-primary lp-cta-btn"
              onClick={() => navigate('/auth?mode=signup')}
            >
              Bắt đầu miễn phí <ArrowRight size={20} style={{marginLeft: '8px'}}/>
            </button>
            <button 
              className="lp-btn lp-btn-outline lp-cta-btn"
              onClick={() => navigate('/home')} 
            >
              Dạo quanh một vòng
            </button>
          </div>

            {/* Stats inline với hero content */}
            <div className="hero-stats-inline scroll-fade-in-delay">
              <div className="hero-stat-mini">
                <Users size={24} className="mini-stat-icon" />
                <div>
                  <div className="mini-stat-number">10,000+</div>
                  <div className="mini-stat-label">Người dùng</div>
                </div>
              </div>
              <div className="hero-stat-mini">
                <Globe size={24} className="mini-stat-icon" />
                <div>
                  <div className="mini-stat-number">50+</div>
                  <div className="mini-stat-label">Quốc gia</div>
                </div>
              </div>
              <div className="hero-stat-mini">
                <Camera size={24} className="mini-stat-icon" />
                <div>
                  <div className="mini-stat-number">1M+</div>
                  <div className="mini-stat-label">Khoảnh khắc</div>
                </div>
              </div>
            </div>
        </div>

          {/* Right Side - Cards Grid */}
          <div className="hero-cards-wrapper scroll-fade-in" style={{animationDelay: '0.2s'}}>
            <div className="cards-grid-container">
              {/* Row 1 */}
              <div className="lp-card card-1 scroll-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="lp-card-img">
              <img src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=80" alt="Paris" />
              <div className="image-overlay"></div>
            </div>
                <div className="lp-card-content">
            <div className="lp-card-meta">
                    <MapPin size={16} className="map-pin-icon" />
                    <div className="location-info">
                      <strong className="location-name">Paris, France</strong>
              <span className="lp-year">2024</span>
                    </div>
            </div>
            <p className="lp-card-text">Buổi sáng tuyệt vời tại tháp Eiffel... 🥐</p>
                </div>
          </div>

              <div className="lp-card card-2 scroll-slide-up" style={{animationDelay: '0.2s'}}>
            <div className="lp-card-img">
              <img src="https://images.unsplash.com/photo-1533050487297-09b450131914?auto=format&fit=crop&w=500&q=80" alt="Vietnam" />
              <div className="image-overlay"></div>
            </div>
                <div className="lp-card-content">
            <div className="lp-card-meta">
                    <MapPin size={16} className="map-pin-icon" />
                    <div className="location-info">
                      <strong className="location-name">Hội An, VN</strong>
                      <span className="lp-year">2024</span>
                    </div>
                  </div>
                  <p className="lp-card-text">Phố cổ đầy màu sắc và ánh đèn lồng 🏮</p>
            </div>
          </div>

              {/* Row 2 */}
              <div className="lp-card card-3 scroll-slide-up" style={{animationDelay: '0.3s'}}>
             <div className="lp-card-img">
              <img src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=500&q=80" alt="Swiss" />
              <div className="image-overlay"></div>
            </div>
                <div className="lp-card-content">
            <div className="lp-card-meta">
                    <MapPin size={16} className="map-pin-icon" />
                    <div className="location-info">
                      <strong className="location-name">Swiss Alps</strong>
                      <span className="lp-year">2024</span>
                    </div>
                  </div>
                  <p className="lp-card-text">Thiên nhiên hùng vĩ và hồ nước trong xanh 🏔️</p>
            </div>
          </div>

              <div className="lp-card card-4 scroll-slide-up" style={{animationDelay: '0.4s'}}>
            <div className="lp-card-img">
              <img src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=500&q=80" alt="Bali" />
              <div className="image-overlay"></div>
            </div>
                <div className="lp-card-content">
            <div className="lp-card-meta">
                    <MapPin size={16} className="map-pin-icon" />
                    <div className="location-info">
                      <strong className="location-name">Bali, Indonesia</strong>
                      <span className="lp-year">2024</span>
                    </div>
                  </div>
                  <p className="lp-card-text">Thiên đường nhiệt đới với văn hóa độc đáo 🌴</p>
            </div>
          </div>

              {/* Row 3 */}
              <div className="lp-card card-5 scroll-slide-up" style={{animationDelay: '0.5s'}}>
            <div className="lp-card-img">
              <img src="https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=90" alt="Santorini" />
              <div className="image-overlay"></div>
            </div>
                <div className="lp-card-content">
            <div className="lp-card-meta">
                    <MapPin size={16} className="map-pin-icon" />
                    <div className="location-info">
                      <strong className="location-name">Santorini, Hy Lạp</strong>
                      <span className="lp-year">2024</span>
                    </div>
                  </div>
                  <p className="lp-card-text">Hoàng hôn tuyệt đẹp trên biển Aegean 🌅</p>
            </div>
          </div>

              <div className="lp-card card-6 scroll-slide-up" style={{animationDelay: '0.6s'}}>
            <div className="lp-card-img">
              <img src="https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=500&q=80" alt="Kyoto" />
              <div className="image-overlay"></div>
            </div>
                <div className="lp-card-content">
            <div className="lp-card-meta">
                    <MapPin size={16} className="map-pin-icon" />
                    <div className="location-info">
                      <strong className="location-name">Kyoto, Japan</strong>
                      <span className="lp-year">2024</span>
                    </div>
                  </div>
                  <p className="lp-card-text">Văn hóa truyền thống và kiến trúc cổ kính 🏯</p>
                </div>
            </div>
          </div>
          
            {/* Community info */}
            <div className="visual-info scroll-fade-in-delay">
            <Compass size={20} className="info-icon" />
            <p>Những khoảnh khắc thật từ cộng đồng MemoryMap</p>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="lp-features">
        <div className="lp-section-header">
          <h2>Tại sao chọn MemoryMap?</h2>
          <p>Những tính năng được thiết kế dành riêng cho người yêu du lịch.</p>
        </div>
        <div className="lp-grid">
          <div className="lp-feature-item">
            <div className="lp-icon-box">
              <Map size={28} />
            </div>
            <h3>Bản đồ tương tác</h3>
            <p>Ghim mọi điểm đến trên bản đồ thế giới 3D sống động. Xem lại lộ trình di chuyển của bạn một cách trực quan.</p>
          </div>
          <div className="lp-feature-item">
            <div className="lp-icon-box">
              <Shield size={28} />
            </div>
            <h3>Riêng tư tuyệt đối</h3>
            <p>Chế độ "Chỉ mình tôi" cho những khoảnh khắc riêng tư. Dữ liệu được mã hóa an toàn tuyệt đối.</p>
          </div>
          <div className="lp-feature-item">
            <div className="lp-icon-box">
              <Camera size={28} />
            </div>
            <h3>Album ảnh thông minh</h3>
            <p>Tự động sắp xếp ảnh theo địa điểm và thời gian. Tạo nên cuốn nhật ký hành trình kỹ thuật số.</p>
          </div>
          <div className="lp-feature-item">
            <div className="lp-icon-box">
              <Users size={28} />
            </div>
            <h3>Cộng đồng xê dịch</h3>
            <p>Kết nối với những người cùng đam mê. Khám phá những địa điểm ẩn ("hidden gems") từ cộng đồng.</p>
          </div>
          <div className="lp-feature-item">
            <div className="lp-icon-box">
              <Globe size={28} />
            </div>
            <h3>Truy cập mọi nơi</h3>
            <p>Đồng bộ hóa dữ liệu trên mọi thiết bị: Máy tính, điện thoại, máy tính bảng. Ký ức luôn bên bạn.</p>
          </div>
          <div className="lp-feature-item">
            <div className="lp-icon-box">
              <Heart size={28} />
            </div>
            <h3>Hoàn toàn miễn phí</h3>
            <p>Bắt đầu hành trình của bạn mà không tốn chi phí. Nâng cấp chỉ khi bạn cần thêm dung lượng lưu trữ.</p>
          </div>
        </div>
      </section>

      {/* Why Different Section - NEW */}
      <section className="lp-why-different">
        <div className="lp-section-header">
          <h2>Hơn cả một thư viện ảnh</h2>
          <p>MemoryMap không chỉ lưu ảnh, mà còn lưu giữ cả câu chuyện và hành trình của bạn.</p>
        </div>
        
        <div className="comparison-grid">
          <div className="comparison-item old-way">
            <div className="comparison-label">Cách cũ</div>
            <div className="comparison-icon">📱</div>
            <h3>Thư viện ảnh thông thường</h3>
            <ul className="comparison-list">
              <li>❌ Ảnh lưu lộn xộn trong điện thoại</li>
              <li>❌ Quên mất chụp ở đâu, khi nào</li>
              <li>❌ Không thể chia sẻ theo lộ trình</li>
              <li>❌ Dễ mất dữ liệu khi đổi máy</li>
            </ul>
          </div>

          <div className="comparison-arrow">
            <ArrowRight size={40} />
          </div>

          <div className="comparison-item new-way">
            <div className="comparison-label highlight">Cách mới</div>
            <div className="comparison-icon">🗺️</div>
            <h3>MemoryMap</h3>
            <ul className="comparison-list">
              <li>✅ Tự động sắp xếp theo địa điểm</li>
              <li>✅ Gắn chính xác vị trí & thời gian</li>
              <li>✅ Xem lại hành trình trên bản đồ</li>
              <li>✅ Đồng bộ đám mây an toàn</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How it works - Timeline Design */}
      <section className="lp-how-it-works">
        <div className="lp-section-header">
          <h2>Hành trình của bạn bắt đầu từ đây</h2>
          <p>3 bước đơn giản để biến những khoảnh khắc thành bản đồ ký ức vĩnh cửu.</p>
        </div>
        
        <div className="timeline-wrapper">
          {/* Progress Track */}
          <div className="progress-track">
            <div className="track-line"></div>
            <div className="track-dot dot-1"></div>
            <div className="track-dot dot-2"></div>
            <div className="track-dot dot-3"></div>
          </div>

          {/* Steps */}
          <div className="timeline-steps">
            {/* Step 1 - Top */}
            <div className="timeline-step step-top">
              <div className="timeline-card">
                <div className="card-number">01</div>
                <div className="card-icon">
                  <Users size={36} strokeWidth={2.5} />
                </div>
                <h3>Tạo tài khoản</h3>
                <p>Đăng ký miễn phí chỉ với Email hoặc Google. Không cần thẻ tín dụng.</p>
              </div>
            </div>

            {/* Step 2 - Bottom */}
            <div className="timeline-step step-bottom">
              <div className="timeline-card">
                <div className="card-number">02</div>
                <div className="card-icon">
                  <Camera size={36} strokeWidth={2.5} />
                </div>
                <h3>Chia sẻ khoảnh khắc</h3>
                <p>Tải ảnh lên, ghim vị trí và viết câu chuyện của riêng bạn.</p>
              </div>
            </div>

            {/* Step 3 - Top */}
            <div className="timeline-step step-top">
              <div className="timeline-card">
                <div className="card-number">03</div>
                <div className="card-icon">
                  <Map size={36} strokeWidth={2.5} />
                </div>
                <h3>Khám phá bản đồ</h3>
                <p>Nhìn lại toàn bộ hành trình trên bản đồ tương tác 3D.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Destinations - NEW DESIGN */}
      <section className="lp-explore">
        <div className="lp-section-header">
          <h2>Khám phá thế giới cùng MemoryMap</h2>
          <p>Hơn 1 triệu ký ức được lưu giữ tại hơn 50 quốc gia trên toàn thế giới.</p>
        </div>

        <div className="explore-grid">
          {/* Châu Á */}
          <div className="explore-card">
            <div className="explore-image">
              <img src="https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80" alt="Asia" />
              <div className="explore-overlay"></div>
            </div>
            <div className="explore-content">
              <div className="explore-icon">
                <Globe size={24} />
              </div>
              <h3>Châu Á</h3>
              <p className="explore-desc">Từ phố cổ Hội An đến Phú Sĩ huyền thoại</p>
              <div className="explore-stats">
                <span className="stat-item">
                  <MapPin size={16} />
                  <strong>12</strong> quốc gia
                </span>
                <span className="stat-item">
                  <Camera size={16} />
                  <strong>2.4k</strong> bài viết
                </span>
              </div>
            </div>
          </div>

          {/* Châu Âu */}
          <div className="explore-card">
            <div className="explore-image">
              <img src="https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=80" alt="Europe" />
              <div className="explore-overlay"></div>
            </div>
            <div className="explore-content">
              <div className="explore-icon">
                <Globe size={24} />
              </div>
              <h3>Châu Âu</h3>
              <p className="explore-desc">Paris lãng mạn, Venice thơ mộng, Alps hùng vĩ</p>
              <div className="explore-stats">
                <span className="stat-item">
                  <MapPin size={16} />
                  <strong>18</strong> quốc gia
                </span>
                <span className="stat-item">
                  <Camera size={16} />
                  <strong>3.8k</strong> bài viết
                </span>
              </div>
            </div>
          </div>

          {/* Châu Mỹ */}
          <div className="explore-card">
            <div className="explore-image">
              <img src="https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=80" alt="Americas" />
              <div className="explore-overlay"></div>
            </div>
            <div className="explore-content">
              <div className="explore-icon">
                <Globe size={24} />
              </div>
              <h3>Châu Mỹ</h3>
              <p className="explore-desc">Grand Canyon, Machu Picchu, New York sôi động</p>
              <div className="explore-stats">
                <span className="stat-item">
                  <MapPin size={16} />
                  <strong>8</strong> quốc gia
                </span>
                <span className="stat-item">
                  <Camera size={16} />
                  <strong>1.9k</strong> bài viết
                </span>
              </div>
            </div>
          </div>

          {/* Châu Đại Dương */}
          <div className="explore-card">
            <div className="explore-image">
              <img src="https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&w=800&q=80" alt="Oceania" />
              <div className="explore-overlay"></div>
            </div>
            <div className="explore-content">
              <div className="explore-icon">
                <Globe size={24} />
              </div>
              <h3>Châu Đại Dương</h3>
              <p className="explore-desc">Rạn san hô Great Barrier, Sydney Opera House, New Zealand kỳ vĩ</p>
              <div className="explore-stats">
                <span className="stat-item">
                  <MapPin size={16} />
                  <strong>5</strong> quốc gia
                </span>
                <span className="stat-item">
                  <Camera size={16} />
                  <strong>890</strong> bài viết
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lp-center-btn">
          <button className="lp-btn lp-btn-primary" onClick={() => navigate('/home')}>
            Bắt đầu khám phá
          </button>
        </div>
      </section>

      {/* Community Map Visualization - NEW */}
      <section className="lp-community-map">
        <div className="map-content-wrapper">
          <div className="map-text">
            <span className="map-badge">
              <Map size={18} />
              <span>Trực quan & Tương tác</span>
            </span>
            <h2>Nhìn thấy thế giới của bạn</h2>
            <p>Mỗi điểm đỏ là một ký ức. Mỗi đường kẻ là một hành trình. Kết nối các khoảnh khắc để tạo nên câu chuyện riêng của bạn trên bản đồ toàn cầu.</p>
            
            <div className="map-features">
              <div className="map-feature-item">
                <CheckCircle2 size={20} />
                <span>Zoom & khám phá mọi góc nhìn</span>
              </div>
              <div className="map-feature-item">
                <CheckCircle2 size={20} />
                <span>Lọc theo thời gian & địa điểm</span>
              </div>
              <div className="map-feature-item">
                <CheckCircle2 size={20} />
                <span>Chia sẻ bản đồ với bạn bè</span>
              </div>
            </div>
            
            <button className="lp-btn lp-btn-primary" style={{marginTop: '1.5rem'}} onClick={() => navigate('/home')}>
              Xem bản đồ demo
            </button>
          </div>
          
          <div className="map-visual">
            <div className="map-mockup">
              <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80" alt="World Map" />
              <div className="map-pins">
                <div className="pin pin-1"></div>
                <div className="pin pin-2"></div>
                <div className="pin pin-3"></div>
                <div className="pin pin-4"></div>
                <div className="pin pin-5"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="lp-faq">
        <div className="lp-section-header">
          <h2>Câu hỏi thường gặp</h2>
        </div>
        <div className="faq-container">
          {[
            { q: "MemoryMap có miễn phí không?", a: "Có! Chúng tôi cung cấp gói miễn phí vĩnh viễn với đầy đủ tính năng cơ bản. Bạn có thể nâng cấp lên Premium nếu cần lưu trữ không giới hạn." },
            { q: "Ảnh của tôi có được bảo mật không?", a: "Tuyệt đối an toàn. Dữ liệu của bạn được mã hóa và lưu trữ trên hệ thống đám mây bảo mật cao cấp." },
            { q: "Tôi có thể chia sẻ bản đồ với bạn bè không?", a: "Được chứ. Bạn có thể chia sẻ link profile công khai hoặc chia sẻ từng bài viết cụ thể lên mạng xã hội." },
            { q: "Làm sao để bắt đầu?", a: "Chỉ cần nhấn nút 'Đăng ký ngay' ở góc trên bên phải, điền thông tin và bạn đã sẵn sàng!" }
          ].map((item, idx) => (
            <div key={idx} className={`faq-item ${openFaq === idx ? 'open' : ''}`} onClick={() => toggleFaq(idx)}>
              <div className="faq-question">
                <h3>{item.q}</h3>
                <ChevronDown size={20} className={`arrow ${openFaq === idx ? 'rotate' : ''}`} />
              </div>
              <div className="faq-answer">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="lp-footer-cta">
        <h2>Sẵn sàng viết tiếp câu chuyện của bạn?</h2>
        <p>Tham gia cùng hơn 10,000 người dùng đang lưu giữ hành trình mỗi ngày.</p>
        <button 
          className="lp-btn lp-btn-primary lp-cta-btn-large"
          onClick={() => navigate('/auth?mode=signup')}
        >
          Tạo tài khoản miễn phí
        </button>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="brand-row">
              <Leaf size={24} />
              <span>MemoryMap</span>
            </div>
            <p>© 2025 MemoryMap Inc. All rights reserved.</p>
          </div>
          <div className="footer-links">
            <div className="link-col">
              <h4>Sản phẩm</h4>
              <span className="footer-link">Tính năng</span>
              <span className="footer-link">Bảng giá</span>
              <span className="footer-link">Roadmap</span>
            </div>
            <div className="link-col">
              <h4>Công ty</h4>
              <span className="footer-link">Về chúng tôi</span>
              <span className="footer-link">Blog</span>
              <span className="footer-link">Tuyển dụng</span>
            </div>
            <div className="link-col">
              <h4>Hỗ trợ</h4>
              <span className="footer-link">Trung tâm trợ giúp</span>
              <span className="footer-link">Điều khoản</span>
              <span className="footer-link">Bảo mật</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}