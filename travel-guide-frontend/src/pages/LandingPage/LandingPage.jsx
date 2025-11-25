// // pages/LandingPage.jsx
// import React from 'react';
// import { useNavigate } from 'react-router-dom';

// export default function LandingPage() {
//   const navigate = useNavigate();

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
//       {/* Header */}
//       <header className="bg-white shadow-sm">
//         <div className="container mx-auto px-4 py-4">
//           <div className="flex items-center justify-between">
//             <h1 className="text-2xl font-bold text-indigo-600">Travel Guide</h1>
//             <div className="flex items-center space-x-4">
//               <button
//                 onClick={() => navigate('/auth?mode=login')}
//                 className="text-indigo-600 hover:text-indigo-800 transition font-medium"
//               >
//                 Đăng nhập
//               </button>
//               <button
//                 onClick={() => navigate('/auth?mode=register')}
//                 className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
//               >
//                 Đăng ký
//               </button>
//             </div>
//           </div>
//         </div>
//       </header>

//       <div className="container mx-auto px-4 py-16">
//         <div className="max-w-4xl mx-auto text-center">
//           <h1 className="text-5xl font-bold text-gray-800 mb-6">
//             Khám phá thế giới cùng
//             <span className="text-indigo-600"> Travel Guide</span>
//           </h1>
//           <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
//             Chia sẻ những khoảnh khắc đáng nhớ, khám phá những địa điểm tuyệt đẹp 
//             và kết nối với cộng đồng du lịch toàn cầu
//           </p>
          
//           <div className="flex justify-center mb-12">
//             <button
//               onClick={() => navigate('/auth?mode=register')}
//               className="bg-indigo-600 text-white px-8 py-4 rounded-lg hover:bg-indigo-700 transition text-lg font-medium"
//             >
//               Bắt đầu ngay
//             </button>
//           </div>

//           {/* Features */}
//           <div className="grid md:grid-cols-3 gap-8 mb-16">
//             <div className="bg-white rounded-xl shadow-lg p-6">
//               <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                 <span className="text-3xl">📸</span>
//               </div>
//               <h3 className="text-xl font-semibold text-gray-800 mb-2">Chia sẻ khoảnh khắc</h3>
//               <p className="text-gray-600">Lưu giữ và chia sẻ những bức ảnh đẹp từ hành trình của bạn</p>
//             </div>
//             <div className="bg-white rounded-xl shadow-lg p-6">
//               <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                 <span className="text-3xl">📍</span>
//               </div>
//               <h3 className="text-xl font-semibold text-gray-800 mb-2">Đánh dấu địa điểm</h3>
//               <p className="text-gray-600">Gắn thẻ vị trí và khám phá những địa điểm tuyệt vời</p>
//             </div>
//             <div className="bg-white rounded-xl shadow-lg p-6">
//               <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                 <span className="text-3xl">🌍</span>
//               </div>
//               <h3 className="text-xl font-semibold text-gray-800 mb-2">Kết nối cộng đồng</h3>
//               <p className="text-gray-600">Gặp gỡ những người yêu du lịch và chia sẻ trải nghiệm</p>
//             </div>
//           </div>

//           {/* CTA */}
//           <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
//             <h2 className="text-3xl font-bold mb-4">Sẵn sàng bắt đầu hành trình của bạn?</h2>
//             <p className="text-xl mb-6 opacity-90">Tham gia cộng đồng Travel Guide ngay hôm nay</p>
//             <button
//               onClick={() => navigate('/auth?mode=register')}
//               className="bg-white text-indigo-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition text-lg font-medium"
//             >
//               Tạo tài khoản miễn phí
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// src/pages/LandingPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Camera, Heart, Lock, ArrowRight, Map, Image as ImageIcon, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);

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

    // Parallax scroll effect
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 3D tilt effect on scroll for cards
    const handleCardTilt = () => {
      const cards = document.querySelectorAll('.tilt-on-scroll');
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const scrollProgress = (window.innerHeight - rect.top) / window.innerHeight;
        
        if (scrollProgress > 0 && scrollProgress < 1) {
          const tiltX = (scrollProgress - 0.5) * 10;
          const tiltY = (scrollProgress - 0.5) * 5;
          card.style.transform = `perspective(1000px) rotateX(${tiltY}deg) rotateY(${tiltX}deg) translateZ(20px)`;
        }
      });
    };
    window.addEventListener('scroll', handleCardTilt, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleCardTilt);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/70 border-b border-cyan-100/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Map className="w-6 h-6 text-[#06b6d4]" strokeWidth={2.5} />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0891b2] to-[#06b6d4] bg-clip-text text-transparent">
                MemoryMap
              </h1>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#about" className="text-gray-700 hover:text-[#06b6d4] transition-colors duration-300">
                Giới thiệu
              </a>
              <a href="#features" className="text-gray-700 hover:text-[#06b6d4] transition-colors duration-300">
                Tính năng
              </a>
              <a href="#cta" className="text-gray-700 hover:text-[#06b6d4] transition-colors duration-300">
                Bắt đầu
              </a>
            </nav>
            <Button 
              onClick={() => navigate('/auth?mode=login')}
              className="bg-[#06b6d4] hover:bg-[#0891b2] text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Đăng nhập
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 pb-20 overflow-hidden">
        {/* Floating particles with parallax */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="floating-particle" 
            style={{ 
              top: '10%', 
              left: '10%', 
              animationDelay: '0s',
              transform: `translateY(${scrollY * 0.3}px)`
            }} 
          />
          <div 
            className="floating-particle" 
            style={{ 
              top: '20%', 
              right: '15%', 
              animationDelay: '2s',
              transform: `translateY(${scrollY * 0.5}px)`
            }} 
          />
          <div 
            className="floating-particle" 
            style={{ 
              bottom: '30%', 
              left: '20%', 
              animationDelay: '4s',
              transform: `translateY(${scrollY * -0.4}px)`
            }} 
          />
          <div 
            className="floating-particle" 
            style={{ 
              bottom: '20%', 
              right: '25%', 
              animationDelay: '3s',
              transform: `translateY(${scrollY * -0.2}px)`
            }} 
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 fade-in-section">
              <div className="inline-block">
                <span className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-sm font-medium text-[#0891b2] shadow-lg">
                  ✨ Lưu giữ từng khoảnh khắc
                </span>
              </div>
              <h2 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-[#0891b2] via-[#06b6d4] to-[#22d3ee] bg-clip-text text-transparent">
                  Bản đồ
                </span>
                <br />
                <span className="text-gray-800">ký ức cá nhân</span>
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Biến mỗi hành trình, mỗi khoảnh khắc và mỗi cảm xúc thành những dấu ấn riêng tư trên bản đồ của chính bạn. MemoryMap giúp bạn lưu giữ và nhìn lại hành trình cuộc đời một cách đẹp đẽ nhất.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth?mode=register')}
                  className="bg-[#9caf84] hover:bg-[#86a06e] text-white shadow-xl hover:shadow-2xl transition-all duration-300 group"
                >
                  Bắt đầu ngay
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate('/home')}
                  className="border-2 border-[#06b6d4] text-[#0891b2] hover:bg-cyan-50 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Tìm hiểu thêm
                </Button>
              </div>
            </div>

            {/* 3D Card Visual */}
            <div className="relative fade-in-section">
              <div className="relative" style={{ transform: `translateY(${scrollY * -0.1}px)` }}>
                {/* Main card with glassmorphism */}
                <div className="glass-card-3d tilt-on-scroll p-8 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2">
                  <img 
                    src="https://images.unsplash.com/photo-1645387326447-7f7ea34f0162?w=800&q=80" 
                    alt="Travel memories collage" 
                    className="rounded-2xl w-full h-96 object-cover"
                  />
                  
                  {/* Floating info cards with 3D depth */}
                  <div 
                    className="absolute -bottom-6 -left-6 glass-card p-4 rounded-2xl shadow-xl animate-float" 
                    style={{ 
                      animationDelay: '0s',
                      transform: `translateZ(50px) translateY(${scrollY * 0.05}px)`
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#06b6d4] flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">125 địa điểm</p>
                        <p className="text-xs text-gray-500">Đã ghé thăm</p>
                      </div>
                    </div>
                  </div>
                  <div 
                    className="absolute -top-6 -right-6 glass-card p-4 rounded-2xl shadow-xl animate-float" 
                    style={{ 
                      animationDelay: '1s',
                      transform: `translateZ(50px) translateY(${scrollY * -0.05}px)`
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#0891b2] flex items-center justify-center">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">2,847 ảnh</p>
                        <p className="text-xs text-gray-500">Kỷ niệm</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-6 fade-in-section">
            <h3 className="text-4xl lg:text-5xl font-bold text-gray-800">
              Ký ức của bạn,{' '}
              <span className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] bg-clip-text text-transparent">
                Hành trình của bạn
              </span>
            </h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              MemoryMap không chỉ là một ứng dụng – đây là không gian riêng tư để bạn ghi lại từng bước chân, từng cảm xúc và từng khoảnh khắc đáng nhớ trên hành trình cuộc đời. Mỗi địa điểm bạn đến, mỗi bức ảnh bạn chụp, mỗi suy nghĩ bạn ghi lại đều được lưu giữ một cách trọn vẹn và riêng tư.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Không có like, không có follow, không có áp lực xã hội. Chỉ có bạn, ký ức của bạn, và bản đồ hành trình mà chỉ bạn mới thấu hiểu hết ý nghĩa. Đây là câu chuyện của bạn, được kể bằng ngôn ngữ của chính bạn.
            </p>
            <div className="grid md:grid-cols-3 gap-8 pt-12">
              <div className="glass-card scroll-scale p-6 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 rounded-2xl bg-[#06b6d4] flex items-center justify-center mx-auto mb-4 transform-gpu">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">Cá nhân hóa</h4>
                <p className="text-gray-600">
                  Bản đồ của bạn, phong cách của bạn. Tùy chỉnh màu sắc, ngôn ngữ và cảm xúc theo cách riêng.
                </p>
              </div>
              <div className="glass-card scroll-scale p-6 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ transitionDelay: '100ms' }}>
                <div className="w-14 h-14 rounded-2xl bg-[#0891b2] flex items-center justify-center mx-auto mb-4 transform-gpu">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">Riêng tư tuyệt đối</h4>
                <p className="text-gray-600">
                  Không chia sẻ công khai, không mạng xã hội. Chỉ dành cho bạn và những người bạn tin tưởng.
                </p>
              </div>
              <div className="glass-card scroll-scale p-6 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ transitionDelay: '200ms' }}>
                <div className="w-14 h-14 rounded-2xl bg-[#67e8f9] flex items-center justify-center mx-auto mb-4 transform-gpu">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">Vượt thời gian</h4>
                <p className="text-gray-600">
                  Nhìn lại hành trình của bạn qua từng giai đoạn, từ quá khứ đến hiện tại và tương lai.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 fade-in-section">
            <h3 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
              Tính năng
              <span className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] bg-clip-text text-transparent"> nổi bật</span>
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Những công cụ giúp bạn lưu giữ và khám phá lại hành trình cuộc đời một cách dễ dàng nhất
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20 fade-in-section">
            <div className="order-2 lg:order-1">
              <div className="glass-card-3d tilt-on-scroll p-6 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500">
                <img 
                  src="https://images.unsplash.com/photo-1627353801782-c5f1ae64be9e?w=800&q=80" 
                  alt="Memory album" 
                  className="rounded-2xl w-full h-80 object-cover"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-4 slide-in-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 rounded-full">
                <MapPin className="w-5 h-5 text-[#0891b2]" />
                <span className="text-sm font-semibold text-[#0891b2]">Đánh dấu địa điểm</span>
              </div>
              <h4 className="text-3xl font-bold text-gray-800">
                Ghim từng khoảnh khắc lên bản đồ
              </h4>
              <p className="text-lg text-gray-600 leading-relaxed">
                Đánh dấu mọi nơi bạn đã đến, từ những chuyến đi xa đến quán cà phê gần nhà. Mỗi địa điểm là một câu chuyện, mỗi câu chuyện là một phần của bạn.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 slide-in-item">
                  <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                  </div>
                  <span className="text-gray-600">Thêm địa điểm với tọa độ chính xác</span>
                </li>
                <li className="flex items-start gap-3 slide-in-item" style={{ animationDelay: '100ms' }}>
                  <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                  </div>
                  <span className="text-gray-600">Ghi chú cảm xúc và suy nghĩ của bạn</span>
                </li>
                <li className="flex items-start gap-3 slide-in-item" style={{ animationDelay: '200ms' }}>
                  <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                  </div>
                  <span className="text-gray-600">Phân loại theo chủ đề và thời gian</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20 fade-in-section">
            <div className="space-y-4 slide-in-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 rounded-full">
                <ImageIcon className="w-5 h-5 text-[#0891b2]" />
                <span className="text-sm font-semibold text-[#0891b2]">Bộ sưu tập ảnh</span>
              </div>
              <h4 className="text-3xl font-bold text-gray-800">
                Lưu giữ kỷ niệm bằng hình ảnh
              </h4>
              <p className="text-lg text-gray-600 leading-relaxed">
                Mỗi bức ảnh kể một câu chuyện. Tải lên và sắp xếp hình ảnh theo địa điểm, tạo nên album ký ức riêng biệt cho từng hành trình.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 slide-in-item">
                  <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-[#0891b2]" />
                  </div>
                  <span className="text-gray-600">Tải lên không giới hạn hình ảnh</span>
                </li>
                <li className="flex items-start gap-3 slide-in-item" style={{ animationDelay: '100ms' }}>
                  <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-[#0891b2]" />
                  </div>
                  <span className="text-gray-600">Tự động gắn thẻ địa điểm từ metadata</span>
                </li>
                <li className="flex items-start gap-3 slide-in-item" style={{ animationDelay: '200ms' }}>
                  <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-[#0891b2]" />
                  </div>
                  <span className="text-gray-600">Xem ảnh theo timeline hoặc bản đồ</span>
                </li>
              </ul>
            </div>
            <div>
              <div className="glass-card-3d tilt-on-scroll p-6 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500">
                <img 
                  src="https://images.unsplash.com/photo-1565893089337-4680bbb1f34e?w=800&q=80" 
                  alt="Vintage photos" 
                  className="rounded-2xl w-full h-80 object-cover"
                />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center fade-in-section">
            <div className="order-2 lg:order-1">
              <div className="glass-card-3d tilt-on-scroll p-6 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500">
                <img 
                  src="https://images.unsplash.com/photo-1672855134530-636c3fe6476a?w=800&q=80" 
                  alt="Travel map" 
                  className="rounded-2xl w-full h-80 object-cover"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-4 slide-in-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full">
                <Map className="w-5 h-5 text-[#06b6d4]" />
                <span className="text-sm font-semibold text-[#06b6d4]">Khám phá lại</span>
              </div>
              <h4 className="text-3xl font-bold text-gray-800">
                Nhìn lại hành trình theo cách mới
              </h4>
              <p className="text-lg text-gray-600 leading-relaxed">
                Khám phá lại những kỷ niệm theo thời gian, địa điểm hoặc cảm xúc. Xem hành trình của bạn phát triển như thế nào qua từng năm, từng giai đoạn.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 slide-in-item">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                  </div>
                  <span className="text-gray-600">Lọc theo năm, tháng hoặc mùa</span>
                </li>
                <li className="flex items-start gap-3 slide-in-item" style={{ animationDelay: '100ms' }}>
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                  </div>
                  <span className="text-gray-600">Tìm kiếm theo cảm xúc và thẻ tag</span>
                </li>
                <li className="flex items-start gap-3 slide-in-item" style={{ animationDelay: '200ms' }}>
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                  </div>
                  <span className="text-gray-600">Tạo album tổng hợp theo chủ đề</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 via-sky-100 to-blue-100 opacity-50" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center fade-in-section">
            <div className="glass-card-3d p-12 rounded-3xl shadow-2xl">
              <h3 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
                Bắt đầu
                <span className="bg-gradient-to-r from-[#0891b2] to-[#06b6d4] bg-clip-text text-transparent"> hành trình </span>
                của bạn hôm nay
              </h3>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Mỗi hành trình đều đáng được ghi nhớ. Hãy để MemoryMap giúp bạn lưu giữ từng khoảnh khắc đặc biệt một cách riêng tư và đẹp đẽ.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth?mode=register')}
                  className="bg-[#9caf84] hover:bg-[#86a06e] text-white shadow-xl hover:shadow-2xl transition-all duration-300 group px-8 py-6 text-lg"
                >
                  Tạo bản đồ của bạn
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-6">
                Miễn phí · Không cần thẻ tín dụng · Riêng tư 100%
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-gray-300 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Map className="w-6 h-6 text-[#06b6d4]" strokeWidth={2.5} />
                <h4 className="text-xl font-bold text-white">MemoryMap</h4>
              </div>
              <p className="text-sm text-gray-400">
                Bản đồ ký ức cá nhân của bạn. Lưu giữ từng khoảnh khắc, từng hành trình.
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-4">Sản phẩm</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="/#" className="hover:text-[#06b6d4] transition-colors">Tính năng</a></li>
                <li><a href="/#" className="hover:text-[#06b6d4] transition-colors">Bảng giá</a></li>
                <li><a href="/#" className="hover:text-[#06b6d4] transition-colors">Câu hỏi thường gặp</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-4">Công ty</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="/#" className="hover:text-[#06b6d4] transition-colors">Về chúng tôi</a></li>
                <li><a href="/#" className="hover:text-[#06b6d4] transition-colors">Blog</a></li>
                <li><a href="/#" className="hover:text-[#06b6d4] transition-colors">Liên hệ</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-white mb-4">Pháp lý</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="/#" className="hover:text-[#06b6d4] transition-colors">Điều khoản</a></li>
                <li><a href="/#" className="hover:text-[#06b6d4] transition-colors">Chính sách bảo mật</a></li>
                <li><a href="/#" className="hover:text-[#06b6d4] transition-colors">Cookie</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-400">
            <p>© 2025 MemoryMap. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}