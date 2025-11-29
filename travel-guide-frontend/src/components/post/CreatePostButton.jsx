import React from "react";
import { useCreatePostModal } from "./CreatePostModalContext"; 

export default function CreatePostButton() {
  const { openModal } = useCreatePostModal();

  return (
    <button
      onClick={openModal}
      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
    >
      Tạo bài viết
    </button>
  );
}
