/**
 * useProfile Hook
 * Custom hook để quản lý user profile
 */

import { useState, useEffect, useCallback } from 'react';
import profileService from '../services/profileService';

export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  /**
   * Fetch profile từ API
   */
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await profileService.getProfile();
      setProfile(data);
    } catch (err) {
      console.error('Fetch profile error:', err);
      setError(err.message || 'Không thể tải profile');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update profile
   */
  const updateProfile = useCallback(async (updates) => {
    try {
      setLoading(true);
      setError(null);

      // Validate
      if (updates.username && !profileService.validateUsername(updates.username)) {
        throw new Error('Username phải có 3-30 ký tự');
      }

      if (updates.bio && !profileService.validateBio(updates.bio)) {
        throw new Error('Bio không được vượt quá 500 ký tự');
      }

      const response = await profileService.updateProfile(updates);
      setProfile(response.profile || response);
      return response;
    } catch (err) {
      console.error('Update profile error:', err);
      setError(err.message || 'Không thể cập nhật profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Upload avatar
   */
  const uploadAvatar = useCallback(async (file) => {
    try {
      setUploading(true);
      setError(null);

      // Validate file
      const validation = profileService.validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const response = await profileService.uploadAvatar(file);
      setProfile(response.profile || response);
      return response;
    } catch (err) {
      console.error('Upload avatar error:', err);
      setError(err.message || 'Không thể upload avatar');
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  /**
   * Change password
   */
  const changePassword = useCallback(async (oldPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      const response = await profileService.changePassword(oldPassword, newPassword);
      return response;
    } catch (err) {
      console.error('Change password error:', err);
      setError(err.message || 'Không thể đổi mật khẩu');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Fetch profile khi mount
   */
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    uploading,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    changePassword,
    clearError
  };
};

export default useProfile;
