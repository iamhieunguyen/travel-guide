// context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  isAuthenticated as cognitoIsAuthenticated, 
  getCurrentUser as cognitoGetCurrentUser, 
  login as cognitoLogin,
  refreshToken as cognitoRefreshToken,
  signOut as cognitoSignOut
} from '../services/cognito';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Bây giờ dùng biến này
  const [authChecked, setAuthChecked] = useState(false);

  // Memoized functions để tránh re-render không cần thiết
  const checkAuthStatus = useCallback(async () => {
    setLoading(true); // Bây giờ dùng biến loading
    if (cognitoIsAuthenticated()) {
      try {
        const userData = await cognitoGetCurrentUser();
        if (userData) {
          setUser({
            username: userData.username,
            email: userData.attributes?.email,
            ...userData
          });
        }
      } catch (error) {
        console.error('Auth status check error:', error);
        // Thử refresh token nếu có lỗi
        const refreshedToken = await cognitoRefreshToken();
        if (refreshedToken) {
          const userData = await cognitoGetCurrentUser();
          if (userData) {
            setUser({
              username: userData.username,
              email: userData.attributes?.email,
              ...userData
            });
          }
        } else {
          cognitoSignOut();
        }
      }
    }
    setAuthChecked(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const loginHandler = async (username, password) => {
    try {
      await cognitoLogin(username, password);
      const userData = await cognitoGetCurrentUser();
      setUser({
        username: userData.username,
        email: userData.attributes?.email,
        ...userData
      });
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = useCallback(() => {
    cognitoSignOut();
    setUser(null);
  }, []);

  const refreshAuth = useCallback(async () => {
    const refreshedToken = await cognitoRefreshToken();
    if (refreshedToken) {
      const userData = await cognitoGetCurrentUser();
      if (userData) {
        setUser({
          username: userData.username,
          email: userData.attributes?.email,
          ...userData
        });
        return true;
      }
    }
    return false;
  }, []);

  const value = {
    user,
    login: loginHandler,
    logout,
    isAuthenticated: !!user,
    getIdToken: () => localStorage.getItem('idToken'),
    refreshAuth,
    authChecked,
    loading // Thêm loading vào value để có thể sử dụng
  };

  return (
    <AuthContext.Provider value={value}>
      {children} {/* Không kiểm tra authChecked ở đây nữa */}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}