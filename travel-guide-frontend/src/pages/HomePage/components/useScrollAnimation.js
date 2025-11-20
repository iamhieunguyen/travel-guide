import { useEffect } from 'react';

/**
 * Hook tự động áp dụng scroll animation cho tất cả các phần tử có class 'animate-on-scroll'
 * Sử dụng Intersection Observer để phát hiện khi phần tử vào viewport
 * Animation sẽ chạy lại mỗi khi phần tử vào viewport (cuộn lên/cuộn xuống)
 */
export const useScrollAnimation = () => {
  useEffect(() => {
    // Tìm scroll container - ưu tiên tab-content vì nó chứa cả memories-list
    const tabContent = document.querySelector('.tab-content');
    const sidebarContent = document.querySelector('.sidebar-content');
    const scrollContainer = tabContent || sidebarContent;
    
    const observerOptions = {
      threshold: 0.15, // Tăng threshold để chỉ trigger khi phần tử thực sự vào viewport
      rootMargin: '0px 0px -100px 0px', // Tăng margin để chỉ trigger khi phần tử gần viewport
      root: scrollContainer || null, // Sử dụng scroll container làm root
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Phần tử vào viewport - thêm class animate-visible
          entry.target.classList.add('animate-visible');
        } else {
          // Phần tử ra khỏi viewport - remove class để animation chạy lại khi vào lại
          entry.target.classList.remove('animate-visible');
        }
      });
    }, observerOptions);

    // Hàm để setup observer cho các phần tử
    const setupObserver = () => {
      // Unobserve tất cả elements cũ trước
      const oldElements = document.querySelectorAll('.animate-on-scroll');
      oldElements.forEach((el) => {
        observer.unobserve(el);
        // Reset animation - remove class để các phần tử ẩn lại
        el.classList.remove('animate-visible');
      });
      
      // Đợi một chút để đảm bảo DOM đã render xong
      setTimeout(() => {
        // Tìm tất cả các phần tử có class 'animate-on-scroll'
        const elements = document.querySelectorAll('.animate-on-scroll');
        elements.forEach((el) => {
          // Đảm bảo phần tử bắt đầu ở trạng thái ẩn (KHÔNG force hiển thị)
          el.classList.remove('animate-visible');
          // Observe để detect khi scroll vào viewport
          observer.observe(el);
        });
      }, 100);
    };

    // Setup ngay và sau một chút để đảm bảo DOM đã render
    setupObserver();
    const timeoutId = setTimeout(setupObserver, 400);

    // Listen custom event để trigger lại observer khi tab thay đổi
    const handleRefreshObserver = () => {
      setTimeout(setupObserver, 150);
    };
    
    window.addEventListener('refresh-scroll-animation', handleRefreshObserver);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('refresh-scroll-animation', handleRefreshObserver);
      const elements = document.querySelectorAll('.animate-on-scroll');
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);
};

