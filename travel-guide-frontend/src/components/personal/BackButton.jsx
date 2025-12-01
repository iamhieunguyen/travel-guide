import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ onClick }) {
  return (
    <button 
      onClick={onClick}
      className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
      aria-label="Go back"
    >
      <ArrowLeft className="w-6 h-6 text-gray-600" />
    </button>
  );
}

