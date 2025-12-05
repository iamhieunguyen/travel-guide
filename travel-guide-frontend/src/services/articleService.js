// services/article.js - Multi-stack API support

// ===== API base - Now uses dedicated Article API =====
const API_BASE = (
  process.env.REACT_APP_ARTICLE_API_URL ||
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_API_GATEWAY_URL ||
  ""
).replace(/\/+$/, "");

if (!API_BASE) {
  console.warn("Missing REACT_APP_ARTICLE_API_URL – API calls may fail.");
}

// ===== CF (ẢNH) – CloudFront CDN =====
const rawCF = (process.env.REACT_APP_CF_DOMAIN || "").trim();
const CF_BASE = rawCF
  ? (/^https?:\/\//i.test(rawCF) ? rawCF : `https://${rawCF}`).replace(/\/+$/, "")
  : "";

// ===== Simple cache =====
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

// ===== Fetch helper =====
function authHeaders(hasBody = false) {
  const idToken = localStorage.getItem("idToken");
  const xUserId = localStorage.getItem("X_USER_ID");
  const h = {};
  if (hasBody) h["Content-Type"] = "application/json";
  if (idToken) h.Authorization = `Bearer ${idToken}`;
  if (xUserId) h["X-User-Id"] = xUserId;
  return h;
}

async function http(method, path, body, { raw = false, useCache = false } = {}) {
  if (!API_BASE) {
    console.error('❌ REACT_APP_ARTICLE_API_URL is not defined!');
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
    // Handle 401 Unauthorized - session expired
    if (res.status === 401) {
      console.log('🔐 401 Unauthorized - Session expired');
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
    
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

// ===== S3 Upload =====
function s3UploadHeaders(contentType) {
  return { "Content-Type": contentType };
}

// ===== Image URL builder =====
export function buildImageUrlFromKey(imageKey) {
  if (!imageKey || !CF_BASE) return "";
  return `${CF_BASE}/${imageKey}`;
}

// ===== Upload presign =====
export async function getUploadUrl({ filename, contentType, articleId = null }) {
  const body = { filename, contentType };
  if (articleId) body.articleId = articleId;
  return http("POST", "/upload-url", body);
}

export async function uploadToS3(url, file, contentType) {
  const headers = s3UploadHeaders(contentType);
  console.log(`🌐 PUT ${url}`);
  console.log("📦 S3 PUT Headers:", headers);

  const res = await fetch(url, { 
    method: "PUT", 
    headers: headers,
    body: file 
  });
    
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("❌ S3 Response Body:", t);
    throw new Error(`S3 upload failed: ${res.status} ${res.statusText}. Error body: ${t.substring(0, 500)}`);
  }
}

// ===== Articles CRUD =====
export function createArticle(body) {
  return http("POST", "/articles", body);
}

export function getArticle(articleId, { presign = false } = {}) {
  const qs = presign ? "?presign=1" : "";
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


// ===== Create Article with Multiple Files =====
export async function createArticleWithMultipleFiles(files, articleMetadata) {
  if (!files || files.length === 0) {
    return createArticle(articleMetadata);
  }

  console.log(`📦 Bắt đầu upload ${files.length} files...`);

  let articleId = null;
  const imageKeys = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const contentType = file.type || "application/octet-stream";
    const filename = file.name || `image-${index}.png`;

    const uploadResponse = await getUploadUrl({ 
      filename, 
      contentType,
      articleId: articleId
    });

    if (!articleId && uploadResponse.articleId) {
      articleId = uploadResponse.articleId;
      console.log(`🆔 Got articleId from backend: ${articleId}`);
    }

    await uploadToS3(uploadResponse.uploadUrl, file, contentType);
    imageKeys.push(uploadResponse.key);
  }

  const body = {
    ...articleMetadata,
    articleId: articleId,
    imageKeys: imageKeys.filter(k => k),
  };

  console.log(`✅ Upload hoàn tất. Gửi bài viết với articleId=${articleId}, ${body.imageKeys.length} keys.`);
  return createArticle(body);
}

// ===== Convenience: tạo + upload ảnh (backward compatibility) =====
export async function createArticleWithUpload({
  file, title, content, visibility = "public", lat, lng, tags = [], locationName
}) {
  if (!file) throw new Error("file is required");
  const articleMetadata = { title, content, visibility, lat, lng, tags, locationName };
  return createArticleWithMultipleFiles([file], articleMetadata);
}

// ===== Get display image URL =====
export async function getDisplayImageUrl(article) {
  const { imageKey } = article || {};
  if (!imageKey) return "";

  const cfUrl = buildImageUrlFromKey(imageKey);
  if (cfUrl) return cfUrl;

  const fresh = await getArticle(article.articleId, { presign: true });
  return fresh?.imageUrl || "";
}

// ===== Batch =====
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
  return http("GET", `/me/favorites?${params.toString()}`, null, { useCache: true });
}

// ===== Cache Utils =====
export function clearCache() {
  requestCache.clear();
  console.log('🗑️ All cache cleared');
}

export function clearCacheForEndpoint(path) {
  const keysToDelete = [];
  for (const [key] of requestCache.entries()) {
    if (key.includes(path)) keysToDelete.push(key);
  }
  keysToDelete.forEach(key => requestCache.delete(key));
  if (keysToDelete.length > 0) {
    console.log(`🗑️ Cleared ${keysToDelete.length} cache entries for ${path}`);
  }
}

export function invalidateArticlesCache() {
  clearCacheForEndpoint('/articles');
  clearCacheForEndpoint('/search');
}

export function listArticlesNoCache({ scope = "public", limit = 10, nextToken } = {}) {
  const params = new URLSearchParams();
  params.set("scope", scope);
  if (limit) params.set("limit", String(limit));
  if (nextToken) params.set("nextToken", nextToken);
  return http("GET", `/articles?${params.toString()}`, null, { useCache: false });
}

// ===== Default export =====
const articleService = {
  getUploadUrl,
  uploadToS3,
  createArticle,
  getArticle,
  updateArticle,
  deleteArticle,
  listArticles,
  listArticlesNoCache,
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
  invalidateArticlesCache,
  clearCacheForEndpoint,
};

export default articleService;

export async function createArticleWithMultipleUploads({
  files, title, content, visibility = "public", lat, lng, tags = [], locationName
}) {
  if (!files || files.length === 0) throw new Error("files array is required");
  
  const imageKeys = [];
  for (const file of files) {
    const contentType = file.type || "application/octet-stream";
    const { uploadUrl, key } = await getUploadUrl({ 
      filename: file.name || "image.png", 
      contentType 
    });
    await uploadToS3(uploadUrl, file, contentType);
    imageKeys.push(key);
  }
  
  return createArticle({ 
    title, content, visibility, lat, lng, tags, 
    imageKeys: imageKeys,
    locationName 
  });
}
