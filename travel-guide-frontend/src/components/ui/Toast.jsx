// components/Toast.jsx
import { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    console.log('Toast mounted:', message);
    const timer = setTimeout(() => {
      console.log('Toast auto-closing');
      onClose();
    }, 5000);

    return () => {
      console.log('Toast unmounted');
      clearTimeout(timer);
    };
  }, [onClose, message]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

  console.log('Toast rendering:', { message, type, bgColor });

  return (
    <div 
      className="fixed top-4 right-4 z-[99999]" 
      style={{ 
        animation: 'slideIn 0.3s ease-out',
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 99999
      }}
    >
      <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 min-w-[300px]`}>
        <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
          {icon}
        </div>
        <p className="flex-1 font-medium">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
