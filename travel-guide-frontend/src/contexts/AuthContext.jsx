// context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  isAuthenticated as cognitoIsAuthenticated, 
  getCurrentUser as cognitoGetCurrentUser, 
  login as cognitoLogin,
  refreshToken as cognitoRefreshToken,
  signOut as cognitoSignOut,
  isTokenExpired
} from '../services/cognito';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

const FALLBACK_BIO = "Lưu giữ những mảnh ghép của cuộc đời.";
const FALLBACK_SHOW_LOCATION = true;
const FALLBACK_DEFAULT_PRIVACY = "public";
const FALLBACK_MAP_TYPE = "roadmap";
const SHOW_LOCATION_KEY = "showLocationPref";
const DEFAULT_PRIVACY_KEY = "defaultPrivacyPref";
const MAP_TYPE_KEY = "mapTypePref";

// Token refresh interval (check every 5 minutes)
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000;
// Refresh token 10 minutes before expiry
const REFRESH_BEFORE_EXPIRY = 10 * 60;

function getDisplayNameFromUser(userData) {
  if (!userData) return "";
  const stored = localStorage.getItem("displayNameOverride");
  if (stored && stored.trim()) return stored.trim();
  const attrName = userData.attributes?.name;
  if (attrName && attrName.trim()) return attrName.trim();
  if (userData.username) return userData.username;
  const email = userData.attributes?.email || "";
  if (email.includes("@")) return email.split("@")[0];
  return "";
}

function getProfileBioFromUser(userData) {
  if (!userData) return FALLBACK_BIO;
  const stored = localStorage.getItem("profileBioOverride");
  if (stored && stored.trim()) return stored.trim();
  const attrBio = userData?.attributes?.bio;
  if (attrBio && attrBio.trim()) return attrBio.trim();
  return FALLBACK_BIO;
}

function getShowLocationPref(userData) {
  const stored = localStorage.getItem(SHOW_LOCATION_KEY);
  if (stored !== null) return stored === "true";
  const attr = userData?.attributes?.showLocationPref;
  if (typeof attr === "boolean") return attr;
  if (typeof attr === "string") return attr === "true";
  return FALLBACK_SHOW_LOCATION;
}

function getDefaultPrivacyPref(userData) {
  const stored = localStorage.getItem(DEFAULT_PRIVACY_KEY);
  if (stored === "public" || stored === "private") return stored;
  const attr = userData?.attributes?.defaultPrivacyPref;
  if (attr === "public" || attr === "private") return attr;
  return FALLBACK_DEFAULT_PRIVACY;
}

function getMapTypePref(userData) {
  const stored = localStorage.getItem(MAP_TYPE_KEY);
  if (stored) {
    if (stored === "satellite" || stored === "roadmap") return stored;
    if (stored === "terrain" || stored === "hybrid") return "satellite";
  }
  const attr = userData?.attributes?.mapTypePref;
  if (attr === "satellite" || attr === "roadmap") return attr;
  if (attr === "terrain" || attr === "hybrid") return "satellite";
  return FALLBACK_MAP_TYPE;
}

// Check if token will expire soon
function willTokenExpireSoon(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp;
    const now = Date.now() / 1000;
    return (expiresAt - now) < REFRESH_BEFORE_EXPIRY;
  } catch (e) {
    return true;
  }
}

function formatUser(userData) {
  if (!userData) return null;
  const sub = userData.attributes?.sub;
  if (sub) {
    try {
      localStorage.setItem("X_USER_ID", sub);
    } catch (e) {
      console.warn("Không thể lưu X_USER_ID vào localStorage:", e);
    }
  }
  return {
    ...userData,
    username: userData.username,
    email: userData.attributes?.email,
    sub,
    displayName: getDisplayNameFromUser(userData),
    bio: getProfileBioFromUser(userData),
    showLocationPref: getShowLocationPref(userData),
    defaultPrivacyPref: getDefaultPrivacyPref(userData),
    mapTypePref: getMapTypePref(userData),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const navigate = useNavigate();
  const tokenCheckIntervalRef = useRef(null);

  // Handle session expiry - show modal
  const handleSessionExpired = useCallback(() => {
    console.log('🔐 Session expired, showing modal');
    cognitoSignOut();
    setUser(null);
    setShowSessionExpiredModal(true);
  }, []);

  // Auto-refresh token before expiry
  const checkAndRefreshToken = useCallback(async () => {
    const idToken = localStorage.getItem('idToken');
    
    if (!idToken) return;
    
    // Check if token is expired
    if (isTokenExpired(idToken)) {
      console.log('🔐 Token expired, attempting refresh...');
      const refreshedToken = await cognitoRefreshToken();
      if (!refreshedToken) {
        console.log('🔐 Refresh failed, session expired');
        handleSessionExpired();
        return;
      }
      console.log('🔐 Token refreshed successfully');
    }
    // Check if token will expire soon
    else if (willTokenExpireSoon(idToken)) {
      console.log('🔐 Token expiring soon, refreshing...');
      const refreshedToken = await cognitoRefreshToken();
      if (refreshedToken) {
        console.log('🔐 Token refreshed successfully');
      }
    }
  }, [handleSessionExpired]);

  const checkAuthStatus = useCallback(async () => {
    setLoading(true);
    if (cognitoIsAuthenticated()) {
      try {
        const userData = await cognitoGetCurrentUser();
        if (userData) {
          setUser(formatUser(userData));
        }
      } catch (error) {
        console.error('Auth status check error:', error);
        const refreshedToken = await cognitoRefreshToken();
        if (refreshedToken) {
          const userData = await cognitoGetCurrentUser();
          if (userData) {
            setUser(formatUser(userData));
          }
        } else {
          cognitoSignOut();
        }
      }
    }
    setAuthChecked(true);
    setLoading(false);
  }, []);

  // Initial auth check
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Listen for session expired events from API calls
  useEffect(() => {
    const handleSessionExpiredEvent = () => {
      handleSessionExpired();
    };

    window.addEventListener('session-expired', handleSessionExpiredEvent);
    
    return () => {
      window.removeEventListener('session-expired', handleSessionExpiredEvent);
    };
  }, [handleSessionExpired]);

  // Set up token refresh interval when user is logged in
  useEffect(() => {
    if (user) {
      // Check immediately
      checkAndRefreshToken();
      
      // Set up interval
      tokenCheckIntervalRef.current = setInterval(checkAndRefreshToken, TOKEN_CHECK_INTERVAL);
      
      return () => {
        if (tokenCheckIntervalRef.current) {
          clearInterval(tokenCheckIntervalRef.current);
        }
      };
    }
  }, [user, checkAndRefreshToken]);

  const loginHandler = async (username, password) => {
    try {
      await cognitoLogin(username, password);
      const userData = await cognitoGetCurrentUser();
      setUser(formatUser(userData));
      setShowSessionExpiredModal(false);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = useCallback(() => {
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
    }
    cognitoSignOut();
    setUser(null);
    navigate("/");
  }, [navigate]);

  const refreshAuth = useCallback(async () => {
    const refreshedToken = await cognitoRefreshToken();
    if (refreshedToken) {
      const userData = await cognitoGetCurrentUser();
      if (userData) {
        setUser(formatUser(userData));
        return true;
      }
    }
    return false;
  }, []);

  const updateDisplayName = useCallback((newName) => {
    const trimmed = newName?.trim() || "";
    if (trimmed) {
      localStorage.setItem("displayNameOverride", trimmed);
    } else {
      localStorage.removeItem("displayNameOverride");
    }
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, displayName: trimmed || prev.displayName || prev.username || prev.email || "" };
    });
  }, []);

  const updateProfileBio = useCallback((newBio) => {
    const trimmed = newBio?.trim() || "";
    localStorage.setItem("profileBioOverride", trimmed || FALLBACK_BIO);
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, bio: trimmed || FALLBACK_BIO };
    });
  }, []);

  const updateShowLocationPref = useCallback((nextValue) => {
    const normalized = !!nextValue;
    localStorage.setItem(SHOW_LOCATION_KEY, normalized ? "true" : "false");
    setUser((prev) => prev ? { ...prev, showLocationPref: normalized } : prev);
  }, []);

  const updateDefaultPrivacyPref = useCallback((nextValue) => {
    const normalized = nextValue === "private" ? "private" : "public";
    localStorage.setItem(DEFAULT_PRIVACY_KEY, normalized);
    setUser((prev) => prev ? { ...prev, defaultPrivacyPref: normalized } : prev);
  }, []);

  const updateMapTypePref = useCallback((nextValue) => {
    const allowed = ["roadmap", "satellite"];
    const normalized = allowed.includes(nextValue) ? nextValue : FALLBACK_MAP_TYPE;
    localStorage.setItem(MAP_TYPE_KEY, normalized);
    setUser((prev) => prev ? { ...prev, mapTypePref: normalized } : prev);
  }, []);

  const closeSessionExpiredModal = useCallback(() => {
    setShowSessionExpiredModal(false);
  }, []);

  const value = {
    user,
    login: loginHandler,
    logout,
    isAuthenticated: !!user,
    getIdToken: () => localStorage.getItem('idToken'),
    refreshAuth,
    authChecked,
    loading,
    showSessionExpiredModal,
    closeSessionExpiredModal,
    handleSessionExpired,
    updateDisplayName,
    updateProfileBio,
    updateShowLocationPref,
    updateDefaultPrivacyPref,
    updateMapTypePref,
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
