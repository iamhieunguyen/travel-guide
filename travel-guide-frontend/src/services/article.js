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

const X_USER_ID = process.env.REACT_APP_X_USER_ID || "";

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
  const h = {};
  if (hasBody) h["Content-Type"] = "application/json"; // tránh preflight cho GET
  if (idToken) h.Authorization = `Bearer ${idToken}`;
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
// ===== PHẦN SỬA LỖI: Đảm bảo yêu cầu S3 không có Authorization =====
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

// ===== Upload presign (Chỉnh sửa hàm uploadToS3) =====
export async function getUploadUrl({ filename, contentType }) {
  return http("POST", "/upload-url", { filename, contentType });
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
  return http("GET", `/articles/${encodeURIComponent(articleId)}${qs}`, null, { useCache: true });
}
export function updateArticle(articleId, patchBody) {
  return http("PATCH", `/articles/${encodeURIComponent(articleId)}`, patchBody);
}
export function deleteArticle(articleId) {
  return http("DELETE", `/articles/${encodeURIComponent(articleId)}`);
}

// ===== List + Search (Giữ nguyên) =====
export function listArticles({ scope = "public", limit = 10, nextToken } = {}) {
  const params = new URLSearchParams();
  params.set("scope", scope);
  if (limit) params.set("limit", String(limit));
  if (nextToken) params.set("nextToken", nextToken);
  return http("GET", `/articles?${params.toString()}`, null, { useCache: true });
}
export function searchArticles({ bbox, q = "", tags = "", scope = "public", limit = 10, nextToken } = {}) {
  const params = new URLSearchParams();
  params.set("bbox", bbox);
  params.set("scope", scope);
  if (q) params.set("q", q);
  if (tags) params.set("tags", tags);
  if (limit) params.set("limit", String(limit));
  if (nextToken) params.set("nextToken", nextToken);
  return http("GET", `/search?${params.toString()}`, null, { useCache: true });
}

// ===== Convenience: tạo + upload ảnh (Giữ nguyên) =====
export async function createArticleWithUpload({
  file, title, content, visibility = "public", lat, lng, tags = [],
}) {
  if (!file) throw new Error("file is required");
  const contentType = file.type || "application/octet-stream";

  const { uploadUrl, key } = await getUploadUrl({ filename: file.name || "image.png", contentType });
  await uploadToS3(uploadUrl, file, contentType);

  return createArticle({ title, content, visibility, lat, lng, tags, imageKey: key });
}

// ===== Lấy URL hiển thị ảnh cho 1 bài viết (Giữ nguyên) =====
export async function getDisplayImageUrl(article) {
  const { imageKey } = article || {};
  if (!imageKey) return "";

  // Nếu có CF_DOMAIN thì dùng CDN; nếu không, fallback sang presigned từ API
  const cfUrl = buildImageUrlFromKey(imageKey);
  if (cfUrl) return cfUrl;

  const fresh = await getArticle(article.articleId, { presign: true });
  return fresh?.imageUrl || "";
}

// ===== Batch (Giữ nguyên) =====
export async function getMultipleArticles(articleIds) {
  const promises = articleIds.map((id) => getArticle(id));
  return Promise.all(promises);
}

// ===== Utils (Giữ nguyên) =====
export function clearCache() {
  requestCache.clear();
}

const articleService = {
  getUploadUrl,
  uploadToS3,
  createArticle,
  getArticle,
  updateArticle,
  deleteArticle,
  listArticles,
  searchArticles,
  createArticleWithUpload,
  buildImageUrlFromKey,
  getDisplayImageUrl,
  getMultipleArticles,
  clearCache,
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
