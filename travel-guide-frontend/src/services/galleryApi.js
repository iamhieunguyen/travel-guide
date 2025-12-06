// services/galleryApi.js - Uses dedicated Gallery API

const API_BASE = (
  process.env.REACT_APP_GALLERY_API_URL ||
  process.env.REACT_APP_API_BASE ||
  ""
).replace(/\/+$/, "");

if (!API_BASE) {
  console.warn("Missing REACT_APP_GALLERY_API_URL – Gallery API calls may fail.");
}

/**
 * Get trending tags from all articles
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of tags to return (default: 20)
 * @returns {Promise<{items: Array, total_tags: number}>}
 */
export async function getTrendingTags({ limit = 20 } = {}) {
  try {
    const url = `${API_BASE}/gallery/trending?limit=${limit}&_t=${Date.now()}`;
    console.log('🔍 Fetching trending tags:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log('🔐 401 Unauthorized - Session expired');
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
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
 * @param {Object} options - Query options
 * @param {string} options.tag - Tag to search for (required)
 * @param {number} options.limit - Number of articles to return (default: 10)
 * @returns {Promise<{items: Array}>}
 */
export async function getArticlesByTag({ tag, limit = 10 } = {}) {
  try {
    if (!tag) {
      throw new Error('tag parameter is required');
    }
    
    const url = `${API_BASE}/gallery/articles?tag=${encodeURIComponent(tag)}&limit=${limit}&_t=${Date.now()}`;
    console.log('🔍 Fetching articles by tag:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log('🔐 401 Unauthorized - Session expired');
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
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
