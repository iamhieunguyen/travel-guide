import React from "react";

export default function ExampleComponent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          👋 Xin chào từ Tailwind + React
        </h1>
        <p className="text-gray-600 mb-6">
          Đây là component cơ bản — bạn có thể bắt đầu chỉnh sửa tùy thích.
        </p>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
          Bấm vào tôi
        </button>
      </div>
    </div>
  );
}
