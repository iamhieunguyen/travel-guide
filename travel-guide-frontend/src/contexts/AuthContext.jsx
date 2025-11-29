// context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  isAuthenticated as cognitoIsAuthenticated, 
  getCurrentUser as cognitoGetCurrentUser, 
  login as cognitoLogin,
  refreshToken as cognitoRefreshToken,
  signOut as cognitoSignOut
} from '../services/cognito';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();

  const checkAuthStatus = useCallback(async () => {
    setLoading(true);
    
    if (cognitoIsAuthenticated()) {
      try {
        const userData = await cognitoGetCurrentUser();
        if (userData) {
          // ✅ LẤY SUB TỪ ATTRIBUTES CỦA COGNITO
          const sub = userData.attributes?.sub;
          setUser({
            username: userData.username,
            email: userData.attributes?.email,
            sub, // 👈 ĐÃ THÊM SUB VÀO USER
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
            const sub = userData.attributes?.sub;
            setUser({
              username: userData.username,
              email: userData.attributes?.email,
              sub,
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
      // ✅ LẤY SUB KHI ĐĂNG NHẬP
      const sub = userData.attributes?.sub;
      setUser({
        username: userData.username,
        email: userData.attributes?.email,
        sub, // 👈 ĐÃ THÊM SUB VÀO USER
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
    navigate("/");
  }, [navigate]);

  const refreshAuth = useCallback(async () => {
    const refreshedToken = await cognitoRefreshToken();
    if (refreshedToken) {
      const userData = await cognitoGetCurrentUser();
      if (userData) {
        // ✅ LẤY SUB KHI REFRESH
        const sub = userData.attributes?.sub;
        setUser({
          username: userData.username,
          email: userData.attributes?.email,
          sub, // 👈 ĐÃ THÊM SUB VÀO USER
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
    getIdToken: () => {
      return localStorage.getItem('idToken');
    },
    refreshAuth,
    authChecked,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
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