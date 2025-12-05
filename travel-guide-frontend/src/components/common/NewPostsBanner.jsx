// components/common/NewPostsBanner.jsx
import { ArrowUp } from 'lucide-react';

export default function NewPostsBanner({ count, onLoadNew }) {
  if (count <= 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down" role="status" aria-live="polite">
      <button
        onClick={onLoadNew}
        className="bg-[#92ADA4] hover:bg-[#7d9a91] text-white px-6 py-3 rounded-full shadow-lg transition-all hover:shadow-xl flex items-center gap-2 font-medium"
        aria-label={`${count} bài viết mới. Click để xem`}
      >
        <ArrowUp className="w-4 h-4" />
        <span>{count} bài mới</span>
      </button>
    </div>
  );
}
