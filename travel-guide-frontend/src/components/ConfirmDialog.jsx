// components/ConfirmDialog.jsx
import { useState, useEffect } from 'react';

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'vi';
    return localStorage.getItem('appLanguage') || 'vi';
  });

  // Listen for language changes
  useEffect(() => {
    const handleStorageChange = () => {
      const newLang = localStorage.getItem('appLanguage') || 'vi';
      setLanguage(newLang);
    };

    // Check language on mount and when storage changes
    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case storage event doesn't fire
    const interval = setInterval(handleStorageChange, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const TEXT = {
    vi: {
      cancel: 'Hủy',
      ok: 'OK',
    },
    en: {
      cancel: 'Cancel',
      ok: 'OK',
    },
  };

  const L = TEXT[language] || TEXT.vi;

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999998,
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div 
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 999999,
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          minWidth: '400px',
          animation: 'scaleIn 0.3s ease-out',
          fontFamily: 'Poppins, sans-serif'
        }}
      >
        <p style={{
          fontSize: '15px',
          color: '#4b5563',
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>
          {message}
        </p>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              background: 'white',
              border: '1px solid #d1d5db',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              padding: '10px 24px',
              borderRadius: '8px',
              transition: 'all 0.2s',
              minWidth: '100px'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'white';
            }}
          >
            {L.cancel}
          </button>
          
          <button
            onClick={onConfirm}
            style={{
              background: '#3b82f6',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              padding: '10px 24px',
              borderRadius: '8px',
              transition: 'all 0.2s',
              minWidth: '100px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#2563eb';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#3b82f6';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
            }}
          >
            {L.ok}
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
