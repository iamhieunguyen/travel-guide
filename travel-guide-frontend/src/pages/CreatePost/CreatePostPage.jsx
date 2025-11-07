// src/pages/CreatePost/CreatePostPage.jsx
import React, { useState } from "react";

const CreatePostPage = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !description || !image) {
      alert("Vui lòng nhập đủ thông tin và chọn ảnh!");
      return;
    }
    alert("Bài viết đã được tạo!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-lime-900 p-6">
      <div className="bg-white/10 backdrop-blur-lg text-white rounded-2xl shadow-xl w-full max-w-lg p-8 border border-white/20">
        <h1 className="text-3xl font-bold text-center mb-6 text-lime-300">
          ✏️ Tạo bài viết mới
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-2 font-medium">Tiêu đề</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:ring-2 focus:ring-lime-400 focus:outline-none"
              placeholder="Nhập tiêu đề..."
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:ring-2 focus:ring-lime-400 focus:outline-none"
              placeholder="Nhập mô tả..."
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">Ảnh</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-lime-500 file:text-gray-900 hover:file:bg-lime-400"
            />
            {image && (
              <img
                src={URL.createObjectURL(image)}
                alt="preview"
                className="mt-4 rounded-lg w-full object-cover max-h-60"
              />
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-lime-500 hover:bg-lime-400 text-gray-900 font-semibold rounded-xl transition-all duration-300"
          >
            Đăng bài
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePostPage;
