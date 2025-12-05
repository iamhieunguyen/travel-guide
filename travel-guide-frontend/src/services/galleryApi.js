// services/galleryApi.js
import api from './article';

const API_BASE = (
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_API_GATEWAY_URL ||
  ""
).replace(/\/+$/, "");

/**
 * Get trending tags from all articles
 * 
 * Returns tags sorted by popularity (count = number of photos containing each tag)
 * 
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of tags to return (default: 20)
 * @returns {Promise<{items: Array, total_tags: number}>}
 * 
 * Response format:
 * {
 *   items: [
 *     {
 *       tag_name: "Beach",
 *       count: 150,  // Number of photos that have this tag
 *       cover_image: "articles/...",
 *       last_updated: "2024-01-01T00:00:00Z"
 *     }
 *   ],
 *   total_tags: 245
 * }
 */
export async function getTrendingTags({ limit = 20 } = {}) {
  try {
    const url = `${API_BASE}/gallery/trending?limit=${limit}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching trending tags:', error);
    throw error;
  }
}

/**
 * Get articles by tag - Query from GalleryPhotosTable
 * More reliable than searching ArticlesTable by autoTags
 * 
 * Returns all photos that contain the specified tag
 * 
 * @param {Object} options - Query options
 * @param {string} options.tag - Tag to search for (required)
 * @param {number} options.limit - Number of articles to return (default: 10)
 * @returns {Promise<{items: Array}>}
 * 
 * Response format:
 * {
 *   items: [
 *     {
 *       photo_id: "abc123",
 *       image_url: "articles/abc123.jpg",
 *       tags: ["beach", "sunset", "ocean"],  // All tags for this photo
 *       autoTags: ["beach", "sunset", "ocean"],  // Alias
 *       status: "public",
 *       created_at: "2024-01-01T00:00:00Z"
 *     }
 *   ]
 * }
 */
export async function getArticlesByTag({ tag, limit = 10 } = {}) {
  try {
    if (!tag) {
      throw new Error('tag parameter is required');
    }
    
    const url = `${API_BASE}/gallery/articles?tag=${encodeURIComponent(tag)}&limit=${limit}`;
    console.log('🔍 Fetching articles by tag:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 Articles by tag response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching articles by tag:', error);
    throw error;
  }
}

export default {
  getTrendingTags,
  getArticlesByTag,
};
