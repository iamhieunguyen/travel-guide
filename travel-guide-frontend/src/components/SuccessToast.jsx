// components/SuccessToast.jsx
import { useEffect } from 'react';

export default function SuccessToast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div 
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 999999,
        backgroundColor: 'white',
        color: '#1f2937',
        padding: '20px 24px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '350px',
        animation: 'slideInRight 0.4s ease-out',
        fontFamily: 'Poppins, sans-serif',
        border: '1px solid #e5e7eb'
      }}
    >
      <span style={{ 
        flex: 1, 
        fontSize: '16px', 
        fontWeight: '500',
        color: '#374151'
      }}>
        {message}
      </span>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
