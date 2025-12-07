// services/article.js

// ===== API base (Giữ nguyên) =====
const API_BASE = (
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_API_GATEWAY_URL ||
  ""
).replace(/\/+$/, "");

if (!API_BASE) {
  console.warn("Missing REACT_APP_API_BASE/REACT_APP_API_GATEWAY_URL – API calls may hit FE origin.");
}

// ===== CF (ẢNH) – KHÔNG default (Giữ nguyên) =====
const rawCF = (process.env.REACT_APP_CF_DOMAIN || "").trim();
const CF_BASE = rawCF
  ? (/^https?:\/\//i.test(rawCF) ? rawCF : `https://${rawCF}`).replace(/\/+$/, "")
  : "";

// ===== Simple cache (Giữ nguyên) =====
const requestCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút
const getCacheKey = (method, path, body) => `${method}:${path}:${JSON.stringify(body || {})}`;
const getFromCache = (key) => {
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;
  requestCache.delete(key);
  return null;
};
const setToCache = (key, data) => requestCache.set(key, { data, timestamp: Date.now() });

// ===== Fetch helper (Giữ nguyên) =====
function authHeaders(hasBody = false) {
  const idToken = localStorage.getItem("idToken");
  const xUserId = localStorage.getItem("X_USER_ID");
  const h = {};
  if (hasBody) h["Content-Type"] = "application/json"; // tránh preflight cho GET
  if (idToken) h.Authorization = `Bearer ${idToken}`;
  if (xUserId) h["X-User-Id"] = xUserId;
  return h;
}

async function http(method, path, body, { raw = false, useCache = false } = {}) {
  // Validate API_BASE
  if (!API_BASE) {
    console.error('❌ REACT_APP_API_BASE is not defined!');
    console.error('Current env:', process.env.REACT_APP_API_BASE);
    throw new Error('API configuration error. Please restart the app.');
  }

  const cacheKey = getCacheKey(method, path, body);

  if (useCache && method === "GET") {
    const cached = getFromCache(cacheKey);
    if (cached) return cached;
  }

  const fullUrl = `${API_BASE}${path}`;
  console.log(`🌐 ${method} ${fullUrl}`);

  const res = await fetch(fullUrl, {
    method,
    headers: authHeaders(!!body),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errMsg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      errMsg = j.error || j.message || errMsg;
    } catch {
      try { errMsg = await res.text(); } catch {}
    }
    const e = new Error(errMsg);
    e.status = res.status;
    throw e;
  }

  const data = raw ? res : (res.status === 204 ? null : await res.json());

  if (useCache && method === "GET") setToCache(cacheKey, data);
  return data;
}

// ------------------------------------------------------------------
// ===== PHẦN UPLOAD S3 (Giữ nguyên logic S3 headers) =====
// ------------------------------------------------------------------

// Hàm tạo headers CHỈ chứa Content-Type cho S3 PUT
function s3UploadHeaders(contentType) {
    return { 
        "Content-Type": contentType 
    };
}

// ===== Ảnh (Giữ nguyên) =====
export function buildImageUrlFromKey(imageKey) {
  if (!imageKey || !CF_BASE) return "";
  return `${CF_BASE}/${imageKey}`;
}

// ===== Upload presign =====
// articleId là optional - nếu không có, backend sẽ tạo mới
// Nếu có, backend sẽ dùng articleId đó để tạo S3 key
export async function getUploadUrl({ filename, contentType, articleId = null }) {
  const body = { filename, contentType };
  if (articleId) {
    body.articleId = articleId;
  }
  return http("POST", "/upload-url", body);
}

export async function uploadToS3(url, file, contentType) {
    // SỬA ĐỔI QUAN TRỌNG: Sử dụng headers chỉ có Content-Type
    const headers = s3UploadHeaders(contentType);
    
    // Thêm log để kiểm tra headers trước khi gửi
    console.log(`🌐 PUT ${url}`);
    console.log("📦 S3 PUT Headers:", headers);

    // Dùng fetch thuần, chỉ truyền headers đã được làm sạch
    const res = await fetch(url, { 
        method: "PUT", 
        headers: headers, // <-- CHỈ CÓ Content-Type
        body: file 
    });
    
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    // Thêm lỗi chi tiết để debug lỗi chữ ký S3
    console.error("❌ S3 Response Body:", t);
    throw new Error(`S3 upload failed: ${res.status} ${res.statusText}. Error body: ${t.substring(0, 500)}`);
  }
}

// ===== Articles CRUD (Giữ nguyên) =====
export function createArticle(body) {
  return http("POST", "/articles", body);
}
export function getArticle(articleId, { presign = false } = {}) {
  const qs = presign ? "?presign=1" : "";
  // Lưu ý: Backend đã được sửa để trả về imageUrls và imageUrls[0] là imageUrl
  return http("GET", `/articles/${encodeURIComponent(articleId)}${qs}`, null, { useCache: true });
}
export function updateArticle(articleId, patchBody) {
  return http("PATCH", `/articles/${encodeURIComponent(articleId)}`, patchBody);
}
export function deleteArticle(articleId) {
  return http("DELETE", `/articles/${encodeURIComponent(articleId)}`);
}

// ===== List + Search =====
export function listArticles({ scope = "public", limit = 10, nextToken } = {}) {
  const params = new URLSearchParams();
  params.set("scope", scope);
  if (limit) params.set("limit", String(limit));
  if (nextToken) params.set("nextToken", nextToken);
  return http("GET", `/articles?${params.toString()}`, null, { useCache: true });
}

export function searchArticles({ bbox, q = "", tags = "", scope = "public", limit = 10, nextToken } = {}) {
  const params = new URLSearchParams();
  params.set("scope", scope);
  if (bbox) params.set("bbox", bbox);
  if (q) params.set("q", q);
  if (tags) params.set("tags", tags);
  if (limit) params.set("limit", String(limit));
  if (nextToken) params.set("nextToken", nextToken);
  return http("GET", `/search?${params.toString()}`, null, { useCache: true });
}

// ------------------------------------------------------------------
// 🚀 LOGIC MỚI: TẠO BÀI VIẾT VỚI NHIỀU ẢNH
// ------------------------------------------------------------------

/**
 * Xử lý upload hàng loạt và tạo bài viết với mảng imageKeys.
 * QUAN TRỌNG: Sử dụng cùng articleId cho cả upload và tạo bài viết
 * để Rekognition có thể cập nhật autoTags đúng bài viết.
 * 
 * @param {File[]} files - Mảng các file ảnh (File objects).
 * @param {object} articleMetadata - Metadata của bài viết (title, content, lat, lng, etc.).
 * @returns {Promise<object>} - Bài viết đã tạo.
 */
export async function createArticleWithMultipleFiles(files, articleMetadata) {
  if (!files || files.length === 0) {
    // Nếu không có file, tạo bài viết không ảnh
    return createArticle(articleMetadata);
  }

  console.log(`📦 Bắt đầu upload ${files.length} files...`);

  // Upload ảnh đầu tiên để lấy articleId
  let articleId = null;
  const imageKeys = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const contentType = file.type || "application/octet-stream";
    const filename = file.name || `image-${index}.png`;

    // 1. Lấy URL upload presigned và key
    // Gửi articleId để backend dùng cùng ID cho tất cả ảnh của bài viết này
    const uploadResponse = await getUploadUrl({ 
      filename, 
      contentType,
      articleId: articleId // null cho ảnh đầu tiên, backend sẽ tạo mới
    });

    // Lưu articleId từ response đầu tiên
    if (!articleId && uploadResponse.articleId) {
      articleId = uploadResponse.articleId;
      console.log(`🆔 Got articleId from backend: ${articleId}`);
    }

    // 2. Upload file lên S3
    await uploadToS3(uploadResponse.uploadUrl, file, contentType);

    // 3. Thu thập key
    imageKeys.push(uploadResponse.key);
  }

  // 4. Gọi API tạo bài viết với mảng imageKeys VÀ articleId
  const body = {
    ...articleMetadata,
    articleId: articleId, // Sử dụng cùng articleId để khớp với S3 keys
    imageKeys: imageKeys.filter(k => k),
  };

  console.log(`✅ Upload hoàn tất. Gửi bài viết với articleId=${articleId}, ${body.imageKeys.length} keys.`);
  return createArticle(body);
}

// ===== Convenience: tạo + upload ảnh (Giữ lại để tương thích ngược) =====
// Chức năng này chỉ hỗ trợ một file duy nhất
export async function createArticleWithUpload({
  file, title, content, visibility = "public", lat, lng, tags = [], locationName
}) {
  if (!file) throw new Error("file is required");
  
  // Dùng hàm mới để xử lý một file
  const articleMetadata = { title, content, visibility, lat, lng, tags, locationName };
  return createArticleWithMultipleFiles([file], articleMetadata);
}

// ===== Lấy URL hiển thị ảnh cho 1 bài viết (Giữ nguyên) =====
export async function getDisplayImageUrl(article) {
  // Lấy ảnh cover
  const { imageKey } = article || {};
  if (!imageKey) return "";

  // Nếu có CF_DOMAIN thì dùng CDN; nếu không, fallback sang presigned từ API
  const cfUrl = buildImageUrlFromKey(imageKey);
  if (cfUrl) return cfUrl;

  // Lấy presigned URL (lưu ý: backend trả về imageUrl = imageUrls[0] cho tương thích)
  const fresh = await getArticle(article.articleId, { presign: true });
  return fresh?.imageUrl || "";
}

// ===== Batch (Giữ nguyên) =====
export async function getMultipleArticles(articleIds) {
  const promises = articleIds.map((id) => getArticle(id));
  return Promise.all(promises);
}

// ===== Favorites =====
export function favoriteArticle(articleId) {
  return http("POST", `/articles/${encodeURIComponent(articleId)}/favorite`);
}

export function unfavoriteArticle(articleId) {
  return http("DELETE", `/articles/${encodeURIComponent(articleId)}/favorite`);
}

export function listFavoriteArticles({ limit = 10, nextToken } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (nextToken) params.set("nextToken", nextToken);
  // Không cache để luôn lấy danh sách yêu thích mới nhất
  return http("GET", `/me/favorites?${params.toString()}`, null, { useCache: false });
}

// ===== Utils =====
export function clearCache() {
  requestCache.clear();
  console.log('🗑️ All cache cleared');
}

// ✨ NEW: Clear cache cho specific endpoint
export function clearCacheForEndpoint(path) {
  const keysToDelete = [];
  
  for (const [key] of requestCache.entries()) {
    if (key.includes(path)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => requestCache.delete(key));
  
  if (keysToDelete.length > 0) {
    console.log(`🗑️ Cleared ${keysToDelete.length} cache entries for ${path}`);
  }
}

// ✨ NEW: Invalidate articles cache
export function invalidateArticlesCache() {
  clearCacheForEndpoint('/articles');
  clearCacheForEndpoint('/search');
}

// ✨ NEW: No-cache version for polling
export function listArticlesNoCache({ scope = "public", limit = 10, nextToken } = {}) {
  const params = new URLSearchParams();
  params.set("scope", scope);
  if (limit) params.set("limit", String(limit));
  if (nextToken) params.set("nextToken", nextToken);
  return http("GET", `/articles?${params.toString()}`, null, { 
    useCache: false  // ✅ NO CACHE for real-time polling
  });
}

const articleService = {
  getUploadUrl,
  uploadToS3,
  createArticle,
  getArticle,
  updateArticle,
  deleteArticle,
  listArticles,
  listArticlesNoCache,  // ✨ NEW
  searchArticles,
  createArticleWithUpload,
  createArticleWithMultipleFiles,
  buildImageUrlFromKey,
  getDisplayImageUrl,
  getMultipleArticles,
  favoriteArticle,
  unfavoriteArticle,
  listFavoriteArticles,
  clearCache,
  invalidateArticlesCache,  // ✨ NEW
  clearCacheForEndpoint,    // ✨ NEW
};

export default articleService;

export async function createArticleWithMultipleUploads({
  files, title, content, visibility = "public", lat, lng, tags = [], locationName
}) {
  if (!files || files.length === 0) throw new Error("files array is required");
  
  const imageKeys = [];
  let articleId = null;  // Track articleId across uploads
  
  for (const file of files) {
    const contentType = file.type || "application/octet-stream";
    const uploadResponse = await getUploadUrl({ 
      filename: file.name || "image.png", 
      contentType,
      articleId: articleId  // Use same articleId for all images
    });
    
    // Save articleId from first upload
    if (!articleId && uploadResponse.articleId) {
      articleId = uploadResponse.articleId;
      console.log(`🆔 Got articleId from backend: ${articleId}`);
    }
    
    await uploadToS3(uploadResponse.uploadUrl, file, contentType);
    imageKeys.push(uploadResponse.key);
  }
  
  return createArticle({ 
    articleId: articleId,  // Use same articleId for article creation
    title, 
    content, 
    visibility, 
    lat, 
    lng, 
    tags, 
    imageKeys: imageKeys,
    locationName 
  });
}
