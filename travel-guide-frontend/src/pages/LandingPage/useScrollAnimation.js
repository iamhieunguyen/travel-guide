import { useEffect } from 'react';

export function useScrollAnimation() {
  useEffect(() => {
    // Tạo Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.1, // Khi 10% element hiển thị
        rootMargin: '0px 0px -50px 0px', // Trigger sớm hơn một chút
      }
    );

    // Quan sát tất cả elements có class scroll animation
    const elements = document.querySelectorAll(
      '.scroll-fade-in, .scroll-slide-up, .scroll-fade-in-delay'
    );
    
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, []);
}

