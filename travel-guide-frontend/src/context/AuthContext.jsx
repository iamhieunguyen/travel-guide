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

const FALLBACK_BIO = "Lưu giữ những mảnh ghép của cuộc đời.";
const FALLBACK_SHOW_LOCATION = true;
const FALLBACK_DEFAULT_PRIVACY = "public";
const FALLBACK_MAP_TYPE = "roadmap";
const SHOW_LOCATION_KEY = "showLocationPref";
const DEFAULT_PRIVACY_KEY = "defaultPrivacyPref";
const MAP_TYPE_KEY = "mapTypePref";

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
  if (stored !== null) {
    return stored === "true";
  }
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
    // Các giá trị cũ như 'terrain' / 'hybrid' được map về 'satellite'
    if (stored === "terrain" || stored === "hybrid") return "satellite";
  }
  const attr = userData?.attributes?.mapTypePref;
  if (attr === "satellite" || attr === "roadmap") return attr;
  if (attr === "terrain" || attr === "hybrid") return "satellite";
  return FALLBACK_MAP_TYPE;
}

function formatUser(userData) {
  if (!userData) return null;
  const sub = userData.attributes?.sub;
  // Lưu sub vào localStorage để backend có thể nhận qua header X-User-Id
  if (sub) {
    try {
      localStorage.setItem("X_USER_ID", sub);
    } catch (e) {
      console.warn("Không thể lưu X_USER_ID vào localStorage:", e);
    }
  }
  const displayName = getDisplayNameFromUser(userData);
  const bio = getProfileBioFromUser(userData);
  const showLocationPref = getShowLocationPref(userData);
  const defaultPrivacyPref = getDefaultPrivacyPref(userData);
  const mapTypePref = getMapTypePref(userData);

  return {
    ...userData,
    username: userData.username,
    email: userData.attributes?.email,
    sub,
    displayName,
    bio,
    showLocationPref,
    defaultPrivacyPref,
    mapTypePref,
  };
}

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
          setUser(formatUser(userData));
        }
      } catch (error) {
        console.error('Auth status check error:', error);
        // Thử refresh token nếu có lỗi
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

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const loginHandler = async (username, password) => {
    try {
      await cognitoLogin(username, password);
      const userData = await cognitoGetCurrentUser();
      setUser(formatUser(userData));
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
      return {
        ...prev,
        displayName: trimmed || prev.displayName || prev.username || prev.email || "",
      };
    });
  }, []);

  const updateProfileBio = useCallback((newBio) => {
    const trimmed = newBio?.trim() || "";
    if (trimmed) {
      localStorage.setItem("profileBioOverride", trimmed);
    } else {
      localStorage.setItem("profileBioOverride", FALLBACK_BIO);
    }

    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        bio: trimmed || FALLBACK_BIO,
      };
    });
  }, []);

  const updateShowLocationPref = useCallback((nextValue) => {
    const normalized = !!nextValue;
    localStorage.setItem(SHOW_LOCATION_KEY, normalized ? "true" : "false");
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        showLocationPref: normalized,
      };
    });
  }, []);

  const updateDefaultPrivacyPref = useCallback((nextValue) => {
    const normalized = nextValue === "private" ? "private" : "public";
    localStorage.setItem(DEFAULT_PRIVACY_KEY, normalized);
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        defaultPrivacyPref: normalized,
      };
    });
  }, []);

  const updateMapTypePref = useCallback((nextValue) => {
    const allowed = ["roadmap", "satellite"];
    const normalized = allowed.includes(nextValue) ? nextValue : FALLBACK_MAP_TYPE;
    localStorage.setItem(MAP_TYPE_KEY, normalized);
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        mapTypePref: normalized,
      };
    });
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