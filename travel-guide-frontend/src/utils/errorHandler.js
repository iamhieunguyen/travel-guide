// utils/errorHandler.js

/**
 * Global error handler for API calls
 * Handles authentication errors, network errors, and other common errors
 */

/**
 * Check if error is an authentication error
 */
export function isAuthError(error) {
  return (
    error?.status === 401 ||
    error?.status === 403 ||
    error?.isAuthError === true ||
    error?.message?.includes('Unauthorized') ||
    error?.message?.includes('Forbidden')
  );
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error) {
  return (
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('NetworkError') ||
    error?.message?.includes('Network request failed') ||
    error?.name === 'NetworkError'
  );
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error, language = 'vi') {
  const isVi = language === 'vi';
  
  // Authentication errors
  if (isAuthError(error)) {
    return isVi
      ? '🔒 Phiên đăng nhập đã hết hạn. Đang chuyển về trang đăng nhập...'
      : '🔒 Session expired. Redirecting to login...';
  }
  
  // Network errors
  if (isNetworkError(error)) {
    return isVi
      ? '🌐 Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.'
      : '🌐 Cannot connect to server. Please check your network connection.';
  }
  
  // HTTP status errors
  if (error?.status) {
    switch (error.status) {
      case 404:
        return isVi
          ? '❌ Không tìm thấy tài nguyên.'
          : '❌ Resource not found.';
      case 400:
        return isVi
          ? '⚠️ Yêu cầu không hợp lệ.'
          : '⚠️ Invalid request.';
      case 500:
        return isVi
          ? '💥 Lỗi server. Vui lòng thử lại sau.'
          : '💥 Server error. Please try again later.';
      case 503:
        return isVi
          ? '🔧 Server đang bảo trì. Vui lòng thử lại sau.'
          : '🔧 Server is under maintenance. Please try again later.';
      default:
        break;
    }
  }
  
  // Default error message
  return error?.message || (isVi ? 'Đã xảy ra lỗi' : 'An error occurred');
}

/**
 * Handle authentication error - clear tokens and redirect to login
 */
export function handleAuthError() {
  console.error('🔒 Authentication error - Clearing session and redirecting...');
  
  // Clear all auth data
  localStorage.removeItem('idToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('X_USER_ID');
  
  // Redirect to login after a short delay
  setTimeout(() => {
    window.location.href = '/auth';
  }, 2000);
}

/**
 * Show error toast notification
 */
export function showErrorToast(error, language = 'vi') {
  const message = getErrorMessage(error, language);
  
  if (window.showSuccessToast) {
    window.showSuccessToast(message);
  } else {
    console.error('Toast not available:', message);
  }
  
  // Handle auth errors
  if (isAuthError(error)) {
    handleAuthError();
  }
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling(fn, language = 'vi') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Error in wrapped function:', error);
      showErrorToast(error, language);
      throw error;
    }
  };
}

export default {
  isAuthError,
  isNetworkError,
  getErrorMessage,
  handleAuthError,
  showErrorToast,
  withErrorHandling,
};
