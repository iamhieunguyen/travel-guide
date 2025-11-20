import { useEffect } from 'react';

/**
 * Hook tự động áp dụng scroll animation cho tất cả các phần tử có class 'animate-on-scroll'
 * Sử dụng Intersection Observer để phát hiện khi phần tử vào viewport
 * Animation sẽ chạy lại mỗi khi phần tử vào viewport (cuộn lên/cuộn xuống)
 */
export const useScrollAnimation = () => {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
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

    // Tìm tất cả các phần tử có class 'animate-on-scroll'
    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);
};

