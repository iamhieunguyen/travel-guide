/**
 * Profile Service - Uses dedicated Auth API
 * Service để quản lý user profile (avatar, username, bio, password)
 */

import axios from 'axios';

// Use Auth API for profile endpoints
const AUTH_API_BASE = (
  process.env.REACT_APP_AUTH_API_URL ||
  process.env.REACT_APP_API_BASE ||
  ""
).replace(/\/+$/, "");

// Create axios instance for Auth API
const authApi = axios.create({
  baseURL: AUTH_API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('idToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401 errors
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('🔐 401 Unauthorized - Session expired');
      // Dispatch custom event for session expiry
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
    return Promise.reject(error);
  }
);

/**
 * Lấy thông tin profile của user hiện tại
 * @returns {Promise<Object>} Profile data
 */
export const getProfile = async () => {
  try {
    const response = await authApi.get('/profile');
    return response.data;
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
};

/**
 * Cập nhật thông tin profile
 * @param {Object} profileData - Dữ liệu cần update
 * @returns {Promise<Object>} Updated profile
 */
export const updateProfile = async (profileData) => {
  try {
    const response = await authApi.patch('/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

/**
 * Lấy presigned URL để upload avatar
 * @param {string} filename - Tên file
 * @param {string} contentType - Content type
 * @returns {Promise<Object>} { uploadUrl, avatarKey, expiresIn }
 */
export const getAvatarUploadUrl = async (filename, contentType) => {
  try {
    const response = await authApi.post('/profile/avatar-upload-url', {
      filename,
      contentType
    });
    return response.data;
  } catch (error) {
    console.error('Get avatar upload URL error:', error);
    throw error;
  }
};

/**
 * Upload avatar lên S3 (sử dụng presigned URL)
 */
export const uploadAvatarToS3 = async (uploadUrl, file, contentType) => {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': contentType
      }
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error('Upload avatar to S3 error:', error);
    throw error;
  }
};

/**
 * Complete avatar upload flow
 */
export const uploadAvatar = async (file) => {
  try {
    if (!file.type.startsWith('image/')) {
      throw new Error('File phải là ảnh');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File không được vượt quá 5MB');
    }

    const { uploadUrl, avatarKey } = await getAvatarUploadUrl(file.name, file.type);
    await uploadAvatarToS3(uploadUrl, file, file.type);
    const updatedProfile = await updateProfile({ avatarKey });

    return updatedProfile;
  } catch (error) {
    console.error('Upload avatar error:', error);
    throw error;
  }
};

/**
 * Thay đổi mật khẩu
 */
export const changePassword = async (oldPassword, newPassword) => {
  try {
    if (!oldPassword || !newPassword) {
      throw new Error('Vui lòng nhập đầy đủ mật khẩu');
    }

    if (newPassword.length < 8) {
      throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự');
    }

    const response = await authApi.post('/auth/change-password', {
      oldPassword,
      newPassword
    });

    return response.data;
  } catch (error) {
    console.error('Change password error:', error);
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
};

// ===== Validators =====
export const validateUsername = (username) => {
  if (!username) return false;
  if (username.length < 3 || username.length > 30) return false;
  return true;
};

export const validateBio = (bio) => {
  if (!bio) return true;
  if (bio.length > 500) return false;
  return true;
};

export const validateImageFile = (file) => {
  if (!file) return { valid: false, error: 'Vui lòng chọn file' };
  if (!file.type.startsWith('image/')) return { valid: false, error: 'File phải là ảnh' };
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) return { valid: false, error: 'Chỉ hỗ trợ JPG, PNG, WEBP' };
  
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) return { valid: false, error: 'File không được vượt quá 5MB' };
  
  const minSize = 10 * 1024;
  if (file.size < minSize) return { valid: false, error: 'File quá nhỏ (min 10KB)' };
  
  return { valid: true, error: null };
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const profileService = {
  getProfile,
  updateProfile,
  getAvatarUploadUrl,
  uploadAvatarToS3,
  uploadAvatar,
  changePassword,
  validateUsername,
  validateBio,
  validateImageFile,
  formatFileSize
};

export default profileService;
