// components/gallery/TrendingTagCard.jsx
import React from 'react';

/**
 * Trending Tag Card Component
 * Displays a tag with its photo count and cover image
 * 
 * @param {Object} tag - Tag object with tag_name, count (number of photos), and cover_image
 * @param {Function} onClick - Callback when card is clicked
 * 
 * Features: 
 * - Hover effects with zoom and brightness
 * - Shows number of photos containing this tag on hover
 */
export default function TrendingTagCard({ tag, onClick }) {
  const { tag_name, count, cover_image } = tag;
  
  // Build image URL
  const imageUrl = cover_image
    ? cover_image.startsWith('http')
      ? cover_image
      : `https://${process.env.REACT_APP_CF_DOMAIN}/${cover_image}`
    : 'https://placehold.co/400x400/92ADA4/ffffff?text=No+Image';

  return (
    <div
      onClick={() => onClick && onClick(tag)}
      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={imageUrl}
          alt={tag_name}
          className="w-full h-full object-cover transition-all duration-300 ease-out group-hover:scale-110 brightness-75 group-hover:brightness-90"
          onError={(e) => {
            e.target.src = 'https://placehold.co/200x200/92ADA4/ffffff?text=' + encodeURIComponent(tag_name);
          }}
        />
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
        {/* Tag Name */}
        <h3 className="text-white font-bold text-sm sm:text-base md:text-lg lowercase text-center drop-shadow-lg leading-tight">
          {tag_name}
        </h3>

        {/* Count - Show number of photos with this tag */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-1">
          <span className="text-white/90 text-xs font-medium">{count} ảnh</span>
        </div>
      </div>
    </div>
  );
}
