// components/gallery/TrendingTagCard.jsx
import React from 'react';

/**
 * Trending Tag Card Component
 * Displays a tag with its count and cover image
 * Features: Hover effects with zoom and brightness
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
      className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group shadow-lg hover:shadow-2xl transition-shadow duration-300"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={imageUrl}
          alt={tag_name}
          className="w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-110 group-hover:brightness-110 brightness-75"
          onError={(e) => {
            e.target.src = 'https://placehold.co/400x400/92ADA4/ffffff?text=' + encodeURIComponent(tag_name);
          }}
        />
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/60 transition-all duration-300" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 transition-transform duration-300 group-hover:-translate-y-2">
        {/* Tag Name */}
        <h3 className="text-white font-bold text-2xl md:text-3xl uppercase tracking-wider text-center mb-2 drop-shadow-lg">
          {tag_name}
        </h3>

        {/* Count */}
        <div className="flex items-center gap-2 text-white/90 text-sm md:text-base">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">{count} bài viết</span>
        </div>
      </div>

      {/* Hover Indicator */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
