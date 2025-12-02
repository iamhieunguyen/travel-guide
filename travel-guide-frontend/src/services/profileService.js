/**
 * Profile Service
 * Service để quản lý user profile (avatar, username, bio, password)
 */

import api from './api';
import { getIdToken } from './cognito';

/**
 * Lấy thông tin profile của user hiện tại
 * @returns {Promise<Object>} Profile data
 */
export const getProfile = async () => {
  try {
    const response = await api.get('/profile');
    return response.data;
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
};

/**
 * Cập nhật thông tin profile
 * @param {Object} profileData - Dữ liệu cần update
 * @param {string} profileData.username - Username mới (3-30 ký tự)
 * @param {string} profileData.bio - Bio mới (max 500 ký tự)
 * @param {string} profileData.avatarKey - S3 key của avatar
 * @returns {Promise<Object>} Updated profile
 */
export const updateProfile = async (profileData) => {
  try {
    const response = await api.patch('/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

/**
 * Lấy presigned URL để upload avatar
 * @param {string} filename - Tên file (vd: avatar.jpg)
 * @param {string} contentType - Content type (vd: image/jpeg)
 * @returns {Promise<Object>} { uploadUrl, avatarKey, expiresIn }
 */
export const getAvatarUploadUrl = async (filename, contentType) => {
  try {
    const response = await api.post('/profile/avatar-upload-url', {
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
 * @param {string} uploadUrl - Presigned URL từ getAvatarUploadUrl
 * @param {File} file - File object từ input
 * @param {string} contentType - Content type của file
 * @returns {Promise<void>}
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
 * Complete avatar upload flow (get URL → upload → update profile)
 * @param {File} file - File object từ input
 * @returns {Promise<Object>} Updated profile
 */
export const uploadAvatar = async (file) => {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File phải là ảnh');
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File không được vượt quá 5MB');
    }

    // Step 1: Get presigned URL
    const { uploadUrl, avatarKey } = await getAvatarUploadUrl(
      file.name,
      file.type
    );

    // Step 2: Upload to S3
    await uploadAvatarToS3(uploadUrl, file, file.type);

    // Step 3: Update profile with avatar key
    const updatedProfile = await updateProfile({ avatarKey });

    return updatedProfile;
  } catch (error) {
    console.error('Upload avatar error:', error);
    throw error;
  }
};

/**
 * Thay đổi mật khẩu
 * @param {string} oldPassword - Mật khẩu cũ
 * @param {string} newPassword - Mật khẩu mới (min 8 ký tự)
 * @returns {Promise<Object>} Success message
 */
export const changePassword = async (oldPassword, newPassword) => {
  try {
    // Validate
    if (!oldPassword || !newPassword) {
      throw new Error('Vui lòng nhập đầy đủ mật khẩu');
    }

    if (newPassword.length < 8) {
      throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự');
    }

    const response = await api.post('/auth/change-password', {
      oldPassword,
      newPassword
    });

    return response.data;
  } catch (error) {
    console.error('Change password error:', error);
    
    // Parse error message
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw error;
  }
};

/**
 * Helper: Validate username
 * @param {string} username
 * @returns {boolean}
 */
export const validateUsername = (username) => {
  if (!username) return false;
  if (username.length < 3 || username.length > 30) return false;
  return true;
};

/**
 * Helper: Validate bio
 * @param {string} bio
 * @returns {boolean}
 */
export const validateBio = (bio) => {
  if (!bio) return true; // Bio is optional
  if (bio.length > 500) return false;
  return true;
};

/**
 * Helper: Validate image file
 * @param {File} file
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateImageFile = (file) => {
  if (!file) {
    return { valid: false, error: 'Vui lòng chọn file' };
  }

  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File phải là ảnh' };
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Chỉ hỗ trợ JPG, PNG, WEBP' };
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File không được vượt quá 5MB' };
  }

  const minSize = 10 * 1024; // 10KB
  if (file.size < minSize) {
    return { valid: false, error: 'File quá nhỏ (min 10KB)' };
  }

  return { valid: true, error: null };
};

/**
 * Helper: Format file size
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Export default object với tất cả functions
export default {
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
