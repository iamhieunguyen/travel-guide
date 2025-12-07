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
  CheckCircle2,
  X,
  Moon,
  Sun
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import MapView from '../../components/map/MapView';
import StaticMapView from '../../components/map/StaticMapView';
import './LandingPage.css';
import { useScrollAnimation } from './useScrollAnimation';

const TEXT = {
  vi: {
    nav: {
      login: 'Đăng nhập',
      signup: 'Đăng ký ngay'
    },
    hero: {
      badge: 'Khám phá & Lưu giữ hành trình',
      title1: 'Lưu giữ từng',
      titleHighlight: 'khoảnh khắc',
      title2: 'trên bản đồ cuộc đời',
      description: 'Không chỉ là những bức ảnh, đó là những câu chuyện. Tạo bản đồ ký ức của riêng bạn, đánh dấu những nơi đã đi qua và chia sẻ niềm đam mê xê dịch.',
      ctaStart: 'Bắt đầu miễn phí',
      ctaExplore: 'Dạo quanh một vòng',
      stats: {
        users: 'Người dùng',
        countries: 'Quốc gia',
        moments: 'Khoảnh khắc'
      },
      communityInfo: 'Những khoảnh khắc thật từ cộng đồng MemoryMap'
    },
    cards: {
      card1: 'Buổi sáng tuyệt vời tại tháp Eiffel... 🥐',
      card2: 'Phố cổ đầy màu sắc và ánh đèn lồng 🏮',
      card3: 'Thiên nhiên hùng vĩ và hồ nước trong xanh 🏔️',
      card4: 'Thiên đường nhiệt đới với văn hóa độc đáo 🌴',
      card5: 'Hoàng hôn tuyệt đẹp trên biển Aegean 🌅',
      card6: 'Văn hóa truyền thống và kiến trúc cổ kính 🏯'
    },
    features: {
      title: 'Tại sao chọn MemoryMap?',
      subtitle: 'Những tính năng được thiết kế dành riêng cho người yêu du lịch.',
      map: {
        title: 'Bản đồ tương tác',
        desc: 'Ghim mọi điểm đến trên bản đồ thế giới 3D sống động. Xem lại lộ trình di chuyển của bạn một cách trực quan.'
      },
      privacy: {
        title: 'Riêng tư tuyệt đối',
        desc: 'Chế độ "Chỉ mình tôi" cho những khoảnh khắc riêng tư. Dữ liệu được mã hóa an toàn tuyệt đối.'
      },
      album: {
        title: 'Album ảnh thông minh',
        desc: 'Tự động sắp xếp ảnh theo địa điểm và thời gian. Tạo nên cuốn nhật ký hành trình kỹ thuật số.'
      },
      community: {
        title: 'Cộng đồng xê dịch',
        desc: 'Kết nối với những người cùng đam mê. Khám phá những địa điểm ẩn ("hidden gems") từ cộng đồng.'
      },
      access: {
        title: 'Truy cập mọi nơi',
        desc: 'Đồng bộ hóa dữ liệu trên mọi thiết bị: Máy tính, điện thoại, máy tính bảng. Ký ức luôn bên bạn.'
      },
      free: {
        title: 'Hoàn toàn miễn phí',
        desc: 'Bắt đầu hành trình của bạn mà không tốn chi phí. Nâng cấp chỉ khi bạn cần thêm dung lượng lưu trữ.'
      }
    },
    comparison: {
      title: 'Hơn cả một thư viện ảnh',
      subtitle: 'MemoryMap không chỉ lưu ảnh, mà còn lưu giữ cả câu chuyện và hành trình của bạn.',
      oldWay: 'Cách cũ',
      oldTitle: 'Thư viện ảnh thông thường',
      oldPoints: [
        'Ảnh lưu lộn xộn trong điện thoại',
        'Quên mất chụp ở đâu, khi nào',
        'Không thể chia sẻ theo lộ trình',
        'Dễ mất dữ liệu khi đổi máy'
      ],
      newWay: 'Cách mới',
      newTitle: 'MemoryMap',
      newPoints: [
        'Tự động sắp xếp theo địa điểm',
        'Gắn chính xác vị trí & thời gian',
        'Xem lại hành trình trên bản đồ',
        'Đồng bộ đám mây an toàn'
      ]
    },
    howItWorks: {
      title: 'Hành trình của bạn bắt đầu từ đây',
      subtitle: '3 bước đơn giản để biến những khoảnh khắc thành bản đồ ký ức vĩnh cửu.',
      step1: {
        title: 'Tạo tài khoản',
        desc: 'Đăng ký miễn phí chỉ với Email hoặc Google. Không cần thẻ tín dụng.'
      },
      step2: {
        title: 'Chia sẻ khoảnh khắc',
        desc: 'Tải ảnh lên, ghim vị trí và viết câu chuyện của riêng bạn.'
      },
      step3: {
        title: 'Khám phá bản đồ',
        desc: 'Nhìn lại toàn bộ hành trình trên bản đồ tương tác 3D.'
      }
    },
    explore: {
      title: 'Khám phá thế giới cùng MemoryMap',
      subtitle: 'Hơn 1 triệu ký ức được lưu giữ tại hơn 50 quốc gia trên toàn thế giới.',
      asia: {
        title: 'Châu Á',
        desc: 'Từ phố cổ Hội An đến Phú Sĩ huyền thoại',
        countries: 'quốc gia',
        posts: 'bài viết'
      },
      europe: {
        title: 'Châu Âu',
        desc: 'Paris lãng mạn, Venice thơ mộng, Alps hùng vĩ',
        countries: 'quốc gia',
        posts: 'bài viết'
      },
      americas: {
        title: 'Châu Mỹ',
        desc: 'Grand Canyon, Machu Picchu, New York sôi động',
        countries: 'quốc gia',
        posts: 'bài viết'
      },
      oceania: {
        title: 'Châu Đại Dương',
        desc: 'Rạn san hô Great Barrier, Sydney Opera House, New Zealand kỳ vĩ',
        countries: 'quốc gia',
        posts: 'bài viết'
      },
      cta: 'Bắt đầu khám phá'
    },
    communityMap: {
      badge: 'Trực quan & Tương tác',
      title: 'Nhìn thấy thế giới của bạn',
      desc: 'Mỗi điểm đỏ là một ký ức. Mỗi đường kẻ là một hành trình. Kết nối các khoảnh khắc để tạo nên câu chuyện riêng của bạn trên bản đồ toàn cầu.',
      features: [
        'Zoom & khám phá mọi góc nhìn',
        'Lọc theo thời gian & địa điểm',
        'Chia sẻ bản đồ với bạn bè'
      ],
      cta: 'Xem bản đồ demo'
    },
    faq: {
      title: 'Câu hỏi thường gặp',
      items: [
        {
          q: 'MemoryMap có miễn phí không?',
          a: 'Có! Chúng tôi cung cấp gói miễn phí vĩnh viễn với đầy đủ tính năng cơ bản. Bạn có thể nâng cấp lên Premium nếu cần lưu trữ không giới hạn.'
        },
        {
          q: 'Ảnh của tôi có được bảo mật không?',
          a: 'Tuyệt đối an toàn. Dữ liệu của bạn được mã hóa và lưu trữ trên hệ thống đám mây bảo mật cao cấp.'
        },
        {
          q: 'Tôi có thể chia sẻ bản đồ với bạn bè không?',
          a: 'Được chứ. Bạn có thể chia sẻ link profile công khai hoặc chia sẻ từng bài viết cụ thể lên mạng xã hội.'
        },
        {
          q: 'Làm sao để bắt đầu?',
          a: 'Chỉ cần nhấn nút \'Đăng ký ngay\' ở góc trên bên phải, điền thông tin và bạn đã sẵn sàng!'
        }
      ]
    },
    footerCta: {
      title: 'Sẵn sàng viết tiếp câu chuyện của bạn?',
      subtitle: 'Tham gia cùng hơn 10,000 người dùng đang lưu giữ hành trình mỗi ngày.',
      cta: 'Tạo tài khoản miễn phí'
    },
    footer: {
      copyright: '© 2025 MemoryMap Inc. All rights reserved.',
      product: {
        title: 'Sản phẩm',
        features: 'Tính năng',
        pricing: 'Bảng giá',
        roadmap: 'Roadmap'
      },
      company: {
        title: 'Công ty',
        about: 'Về chúng tôi',
        blog: 'Blog',
        careers: 'Tuyển dụng'
      },
      support: {
        title: 'Hỗ trợ',
        help: 'Trung tâm trợ giúp',
        terms: 'Điều khoản',
        privacy: 'Bảo mật'
      }
    }
  },
  en: {
    nav: {
      login: 'Login',
      signup: 'Sign Up'
    },
    hero: {
      badge: 'Explore & Preserve Your Journey',
      title1: 'Preserve every',
      titleHighlight: 'moment',
      title2: 'on your life map',
      description: 'More than just photos, these are stories. Create your own memory map, mark the places you\'ve been, and share your passion for travel.',
      ctaStart: 'Start Free',
      ctaExplore: 'Take a Tour',
      stats: {
        users: 'Users',
        countries: 'Countries',
        moments: 'Moments'
      },
      communityInfo: 'Real moments from the MemoryMap community'
    },
    cards: {
      card1: 'Wonderful morning at the Eiffel Tower... 🥐',
      card2: 'Colorful ancient town with lantern lights 🏮',
      card3: 'Majestic nature and crystal clear lakes 🏔️',
      card4: 'Tropical paradise with unique culture 🌴',
      card5: 'Beautiful sunset over the Aegean Sea 🌅',
      card6: 'Traditional culture and ancient architecture 🏯'
    },
    features: {
      title: 'Why Choose MemoryMap?',
      subtitle: 'Features designed specifically for travel lovers.',
      map: {
        title: 'Interactive Map',
        desc: 'Pin every destination on a vibrant 3D world map. Visualize your travel routes intuitively.'
      },
      privacy: {
        title: 'Absolute Privacy',
        desc: '"Only Me" mode for private moments. Data is encrypted with absolute security.'
      },
      album: {
        title: 'Smart Photo Album',
        desc: 'Automatically organize photos by location and time. Create a digital travel journal.'
      },
      community: {
        title: 'Travel Community',
        desc: 'Connect with like-minded travelers. Discover hidden gems from the community.'
      },
      access: {
        title: 'Access Anywhere',
        desc: 'Sync data across all devices: Computer, phone, tablet. Memories always with you.'
      },
      free: {
        title: 'Completely Free',
        desc: 'Start your journey at no cost. Upgrade only when you need more storage.'
      }
    },
    comparison: {
      title: 'More Than a Photo Library',
      subtitle: 'MemoryMap doesn\'t just store photos, it preserves your stories and journeys.',
      oldWay: 'Old Way',
      oldTitle: 'Regular Photo Library',
      oldPoints: [
        'Photos scattered in your phone',
        'Forget where and when photos were taken',
        'Can\'t share by route',
        'Easy to lose data when changing devices'
      ],
      newWay: 'New Way',
      newTitle: 'MemoryMap',
      newPoints: [
        'Auto-organize by location',
        'Precise location & time tagging',
        'Review journey on map',
        'Secure cloud sync'
      ]
    },
    howItWorks: {
      title: 'Your Journey Starts Here',
      subtitle: '3 simple steps to turn moments into an eternal memory map.',
      step1: {
        title: 'Create Account',
        desc: 'Sign up free with Email or Google. No credit card required.'
      },
      step2: {
        title: 'Share Moments',
        desc: 'Upload photos, pin locations, and write your own story.'
      },
      step3: {
        title: 'Explore Map',
        desc: 'Review your entire journey on an interactive 3D map.'
      }
    },
    explore: {
      title: 'Explore the World with MemoryMap',
      subtitle: 'Over 1 million memories preserved in more than 50 countries worldwide.',
      asia: {
        title: 'Asia',
        desc: 'From Hoi An ancient town to legendary Mount Fuji',
        countries: 'countries',
        posts: 'posts'
      },
      europe: {
        title: 'Europe',
        desc: 'Romantic Paris, dreamy Venice, majestic Alps',
        countries: 'countries',
        posts: 'posts'
      },
      americas: {
        title: 'Americas',
        desc: 'Grand Canyon, Machu Picchu, vibrant New York',
        countries: 'countries',
        posts: 'posts'
      },
      oceania: {
        title: 'Oceania',
        desc: 'Great Barrier Reef, Sydney Opera House, magnificent New Zealand',
        countries: 'countries',
        posts: 'posts'
      },
      cta: 'Start Exploring'
    },
    communityMap: {
      badge: 'Visual & Interactive',
      title: 'See Your World',
      desc: 'Each red dot is a memory. Each line is a journey. Connect moments to create your own story on the global map.',
      features: [
        'Zoom & explore every angle',
        'Filter by time & location',
        'Share map with friends'
      ],
      cta: 'View Demo Map'
    },
    faq: {
      title: 'Frequently Asked Questions',
      items: [
        {
          q: 'Is MemoryMap free?',
          a: 'Yes! We offer a forever-free plan with all basic features. You can upgrade to Premium if you need unlimited storage.'
        },
        {
          q: 'Are my photos secure?',
          a: 'Absolutely safe. Your data is encrypted and stored on a high-security cloud system.'
        },
        {
          q: 'Can I share my map with friends?',
          a: 'Of course. You can share your public profile link or share specific posts on social media.'
        },
        {
          q: 'How do I get started?',
          a: 'Just click the \'Sign Up\' button in the top right corner, fill in your information, and you\'re ready!'
        }
      ]
    },
    footerCta: {
      title: 'Ready to Continue Your Story?',
      subtitle: 'Join over 10,000 users preserving their journeys every day.',
      cta: 'Create Free Account'
    },
    footer: {
      copyright: '© 2025 MemoryMap Inc. All rights reserved.',
      product: {
        title: 'Product',
        features: 'Features',
        pricing: 'Pricing',
        roadmap: 'Roadmap'
      },
      company: {
        title: 'Company',
        about: 'About Us',
        blog: 'Blog',
        careers: 'Careers'
      },
      support: {
        title: 'Support',
        help: 'Help Center',
        terms: 'Terms',
        privacy: 'Privacy'
      }
    }
  }
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isDarkMode, toggleTheme } = useTheme();
  const [openFaq, setOpenFaq] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  
  useScrollAnimation();

  const L = TEXT[language] || TEXT.vi;

  // Demo locations for map
  const demoLocations = [
    {
      id: 1,
      title: 'Paris, France',
      location: { lat: 48.8566, lng: 2.3522 },
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=200&q=80',
      date: new Date('2024-06-15')
    },
    {
      id: 2,
      title: 'Tokyo, Japan',
      location: { lat: 35.6762, lng: 139.6503 },
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=200&q=80',
      date: new Date('2024-07-20')
    },
    {
      id: 3,
      title: 'New York, USA',
      location: { lat: 40.7128, lng: -74.0060 },
      image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=200&q=80',
      date: new Date('2024-08-10')
    },
    {
      id: 4,
      title: 'Sydney, Australia',
      location: { lat: -33.8688, lng: 151.2093 },
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=200&q=80',
      date: new Date('2024-09-05')
    },
    {
      id: 5,
      title: 'Rio de Janeiro, Brazil',
      location: { lat: -22.9068, lng: -43.1729 },
      image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=200&q=80',
      date: new Date('2024-10-12')
    }
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div
      id="landing-page-wrapper"
      className={isDarkMode ? 'landing-dark' : 'landing-light'}
    >
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
            className="lp-btn lp-btn-ghost theme-toggle-btn"
            onClick={toggleTheme}
            title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button 
            className="lp-btn lp-btn-ghost"
            onClick={() => navigate('/auth?mode=login')}
          >
            {L.nav.login}
          </button>
          <button 
            className="lp-btn lp-btn-primary"
            onClick={() => navigate('/auth?mode=signup')}
          >
            {L.nav.signup}
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
            <span>{L.hero.badge}</span>
          </div>
          
          <h1 className="lp-title">
            {L.hero.title1} <span className="lp-highlight">{L.hero.titleHighlight}</span><br className="desktop-br"/>
            {L.hero.title2}
          </h1>
          
          <p className="lp-desc">
            {L.hero.description}
          </p>

          <div className="lp-cta-group">
            <button 
              className="lp-btn lp-btn-primary lp-cta-btn"
              onClick={() => navigate('/auth?mode=signup')}
            >
              {L.hero.ctaStart} <ArrowRight size={20} style={{marginLeft: '8px'}}/>
            </button>
          </div>

            {/* Stats inline với hero content */}
            <div className="hero-stats-inline scroll-fade-in-delay">
              <div className="hero-stat-mini">
                <Users size={24} className="mini-stat-icon" />
                <div>
                  <div className="mini-stat-number">10,000+</div>
                  <div className="mini-stat-label">{L.hero.stats.users}</div>
                </div>
              </div>
              <div className="hero-stat-mini">
                <Globe size={24} className="mini-stat-icon" />
                <div>
                  <div className="mini-stat-number">50+</div>
                  <div className="mini-stat-label">{L.hero.stats.countries}</div>
                </div>
              </div>
              <div className="hero-stat-mini">
                <Camera size={24} className="mini-stat-icon" />
                <div>
                  <div className="mini-stat-number">1M+</div>
                  <div className="mini-stat-label">{L.hero.stats.moments}</div>
                </div>
              </div>
            </div>

            {/* Community info - Moved here */}
            <div className="visual-info scroll-fade-in-delay">
              <Compass size={20} className="info-icon" />
              <p>{L.hero.communityInfo}</p>
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
            <p className="lp-card-text">{L.cards.card1}</p>
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
                  <p className="lp-card-text">{L.cards.card2}</p>
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
                  <p className="lp-card-text">{L.cards.card3}</p>
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
                  <p className="lp-card-text">{L.cards.card4}</p>
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
                  <p className="lp-card-text">{L.cards.card5}</p>
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
                  <p className="lp-card-text">{L.cards.card6}</p>
                </div>
            </div>
          </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="lp-features">
        <div className="lp-section-header">
          <h2>{L.features.title}</h2>
          <p>{L.features.subtitle}</p>
        </div>
        <div className="lp-grid">
          <div className="lp-feature-item">
            <div className="lp-icon-box">
              <Map size={28} />
            </div>
            <h3>{L.features.map.title}</h3>
            <p>{L.features.map.desc}</p>
          </div>
          <div className="lp-feature-item">
            <div className="lp-icon-box">
              <Shield size={28} />
            </div>
            <h3>{L.features.privacy.title}</h3>
            <p>{L.features.privacy.desc}</p>
          </div>
          <div className="lp-feature-item">
            <div className="lp-icon-box">
              <Camera size={28} />
            </div>
            <h3>{L.features.album.title}</h3>
            <p>{L.features.album.desc}</p>
          </div>
          <div className="lp-feature-item">
            <div className="lp-icon-box">
              <Users size={28} />
            </div>
            <h3>{L.features.community.title}</h3>
            <p>{L.features.community.desc}</p>
          </div>
          <div className="lp-feature-item">
            <div className="lp-icon-box">
              <Globe size={28} />
            </div>
            <h3>{L.features.access.title}</h3>
            <p>{L.features.access.desc}</p>
          </div>
          <div className="lp-feature-item">
            <div className="lp-icon-box">
              <Heart size={28} />
            </div>
            <h3>{L.features.free.title}</h3>
            <p>{L.features.free.desc}</p>
          </div>
        </div>
      </section>

      {/* Why Different Section - NEW */}
      <section className="lp-why-different">
        <div className="lp-section-header">
          <h2>{L.comparison.title}</h2>
          <p>{L.comparison.subtitle}</p>
        </div>
        
        <div className="comparison-grid">
          <div className="comparison-item old-way">
            <div className="comparison-label">{L.comparison.oldWay}</div>
            <div className="comparison-icon">📱</div>
            <h3>{L.comparison.oldTitle}</h3>
            <ul className="comparison-list">
              {L.comparison.oldPoints.map((point, idx) => (
                <li key={idx}>❌ {point}</li>
              ))}
            </ul>
          </div>

          <div className="comparison-arrow">
            <ArrowRight size={40} />
          </div>

          <div className="comparison-item new-way">
            <div className="comparison-label highlight">{L.comparison.newWay}</div>
            <div className="comparison-icon">🗺️</div>
            <h3>{L.comparison.newTitle}</h3>
            <ul className="comparison-list">
              {L.comparison.newPoints.map((point, idx) => (
                <li key={idx}>✅ {point}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works - Timeline Design */}
      <section className="lp-how-it-works">
        <div className="lp-section-header">
          <h2>{L.howItWorks.title}</h2>
          <p>{L.howItWorks.subtitle}</p>
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
                <h3>{L.howItWorks.step1.title}</h3>
                <p>{L.howItWorks.step1.desc}</p>
              </div>
            </div>

            {/* Step 2 - Bottom */}
            <div className="timeline-step step-bottom">
              <div className="timeline-card">
                <div className="card-number">02</div>
                <div className="card-icon">
                  <Camera size={36} strokeWidth={2.5} />
                </div>
                <h3>{L.howItWorks.step2.title}</h3>
                <p>{L.howItWorks.step2.desc}</p>
              </div>
            </div>

            {/* Step 3 - Top */}
            <div className="timeline-step step-top">
              <div className="timeline-card">
                <div className="card-number">03</div>
                <div className="card-icon">
                  <Map size={36} strokeWidth={2.5} />
                </div>
                <h3>{L.howItWorks.step3.title}</h3>
                <p>{L.howItWorks.step3.desc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Map Visualization - NEW */}
      <section className="lp-community-map">
        <div className="map-content-wrapper">
          <div className="map-text">
            <span className="map-badge">
              <Map size={18} />
              <span>{L.communityMap.badge}</span>
            </span>
            <h2>{L.communityMap.title}</h2>
            <p>{L.communityMap.desc}</p>
            
            <div className="map-features">
              {L.communityMap.features.map((feature, idx) => (
                <div key={idx} className="map-feature-item">
                  <CheckCircle2 size={20} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            
            <button className="lp-btn lp-btn-primary" style={{marginTop: '1.5rem'}} onClick={() => setShowMapModal(true)}>
              {L.communityMap.cta}
            </button>
          </div>
          
          <div className="map-visual">
            <div className="map-mockup">
              <StaticMapView locations={demoLocations} />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="lp-faq">
        <div className="lp-section-header">
          <h2>{L.faq.title}</h2>
        </div>
        <div className="faq-container">
          {L.faq.items.map((item, idx) => (
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
        <h2>{L.footerCta.title}</h2>
        <p>{L.footerCta.subtitle}</p>
        <button 
          className="lp-btn lp-btn-primary lp-cta-btn-large"
          onClick={() => navigate('/auth?mode=signup')}
        >
          {L.footerCta.cta}
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
            <p>{L.footer.copyright}</p>
          </div>
          <div className="footer-links">
            <div className="link-col">
              <h4>{L.footer.product.title}</h4>
              <span className="footer-link">{L.footer.product.features}</span>
              <span className="footer-link">{L.footer.product.pricing}</span>
              <span className="footer-link">{L.footer.product.roadmap}</span>
            </div>
            <div className="link-col">
              <h4>{L.footer.company.title}</h4>
              <span className="footer-link">{L.footer.company.about}</span>
              <span className="footer-link">{L.footer.company.blog}</span>
              <span className="footer-link">{L.footer.company.careers}</span>
            </div>
            <div className="link-col">
              <h4>{L.footer.support.title}</h4>
              <span className="footer-link">{L.footer.support.help}</span>
              <span className="footer-link">{L.footer.support.terms}</span>
              <span className="footer-link">{L.footer.support.privacy}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Map Demo Modal */}
      {showMapModal && (
        <div 
          className="map-modal-overlay" 
          onClick={() => setShowMapModal(false)}
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div 
            className="map-modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              width: '90%', 
              maxWidth: '1200px', 
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div className="map-modal-header">
              <h2>{L.communityMap.title}</h2>
              <button 
                className="map-modal-close" 
                onClick={() => setShowMapModal(false)}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>
            <div className="map-modal-body">
              <MapView 
                locations={demoLocations}
                mapType="roadmap"
                userLocation={null}
                onMarkerClick={(marker) => {
                  console.log('Marker clicked:', marker);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}