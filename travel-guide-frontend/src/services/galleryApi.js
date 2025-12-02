// services/galleryApi.js
import api from './article';

const API_BASE = (
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_API_GATEWAY_URL ||
  ""
).replace(/\/+$/, "");

/**
 * Get trending tags from all articles
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of tags to return (default: 20)
 * @returns {Promise<{items: Array, total_tags: number}>}
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

export default {
  getTrendingTags,
};
