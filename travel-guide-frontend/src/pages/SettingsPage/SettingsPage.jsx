import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User,
  Lock,
  Bell,
  Map as MapIcon,
  Palette,
  Trash2,
  LogOut,
  Save,
  Mail,
  Camera,
  Eye,
  EyeOff,
  Shield,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../../components/personal/BackButton';
import PrivacyDropdown from '../../components/settings/PrivacyDropdown';
import LanguageDropdown from '../../components/settings/LanguageDropdown';
import MapTypeDropdown from '../../components/settings/MapTypeDropdown';
import useProfile from '../../hook/useProfile';
import './SettingsPage.css';

// Translations
const translations = {
  vi: {
    // Header
    title: 'Cài đặt',
    logout: 'Đăng xuất',
    
    // Sections
    account: 'Tài khoản',
    privacy: 'Quyền riêng tư',
    notifications: 'Thông báo',
    map: 'Bản đồ',
    appearance: 'Giao diện',
    
    // Account Section
    accountInfo: 'Thông tin tài khoản',
    accountDescription: 'Quản lý thông tin cá nhân của bạn',
    displayName: 'Tên hiển thị',
    displayNamePlaceholder: 'Nhập tên hiển thị',
    email: 'Email',
    emailCannotChange: 'Email không thể thay đổi',
    bio: 'Giới thiệu',
    bioPlaceholder: 'Viết vài dòng giới thiệu về bản thân...',
    saveChanges: 'Lưu thay đổi',
    accountSaved: 'Đã lưu thông tin tài khoản!',
    
    // Privacy Section
    privacySettings: 'Cài đặt quyền riêng tư',
    privacyDescription: 'Kiểm soát ai có thể xem nội dung của bạn',
    defaultPrivacy: 'Quyền riêng tư mặc định',
    defaultPrivacyDesc: 'Thiết lập quyền riêng tư mặc định cho các ký ức mới',
    showLocation: 'Hiển thị vị trí',
    showLocationDesc: 'Cho phép hiển thị vị trí trên bản đồ',
    
    // Notifications Section
    notificationSettings: 'Cài đặt thông báo',
    notificationDescription: 'Quản lý cách bạn nhận thông báo',
    emailNotifications: 'Thông báo qua email',
    emailNotificationsDesc: 'Nhận thông báo quan trọng qua email',
    newMemoryNotifications: 'Thông báo ký ức mới',
    newMemoryNotificationsDesc: 'Nhận thông báo khi có ký ức mới được chia sẻ',
    shareNotifications: 'Thông báo chia sẻ',
    shareNotificationsDesc: 'Nhận thông báo khi ai đó chia sẻ ký ức với bạn',
    
    // Map Section
    mapSettings: 'Cài đặt bản đồ',
    mapDescription: 'Tùy chỉnh trải nghiệm bản đồ của bạn',
    mapType: 'Loại bản đồ',
    mapTypeDesc: 'Chọn loại bản đồ bạn muốn hiển thị',
    autoZoom: 'Tự động phóng to',
    autoZoomDesc: 'Tự động phóng to khi chọn địa điểm',
    
    // Appearance Section
    appearanceSettings: 'Cài đặt giao diện',
    appearanceDescription: 'Tùy chỉnh giao diện ứng dụng',
    theme: 'Giao diện',
    themeDesc: 'Chọn chế độ sáng hoặc tối',
    light: 'Sáng',
    dark: 'Tối',
    language: 'Ngôn ngữ',
    languageDesc: 'Chọn ngôn ngữ hiển thị',
    
    // Security Section
    security: 'Bảo mật',
    securityDescription: 'Quản lý mật khẩu và bảo mật tài khoản',
    changePassword: 'Đổi mật khẩu',
    currentPassword: 'Mật khẩu hiện tại',
    currentPasswordPlaceholder: 'Nhập mật khẩu hiện tại',
    newPassword: 'Mật khẩu mới',
    newPasswordPlaceholder: 'Nhập mật khẩu mới (tối thiểu 8 ký tự)',
    confirmPassword: 'Xác nhận mật khẩu mới',
    confirmPasswordPlaceholder: 'Nhập lại mật khẩu mới',
    cancel: 'Hủy',
    savePassword: 'Lưu mật khẩu',
    passwordMismatch: 'Mật khẩu mới không khớp!',
    passwordTooShort: 'Mật khẩu phải có ít nhất 8 ký tự!',
    passwordChanged: 'Đã đổi mật khẩu thành công!',
    dangerZone: 'Vùng nguy hiểm',
    deleteAccount: 'Xóa tài khoản',
    deleteConfirmTitle: 'Xác nhận xóa tài khoản',
    deleteConfirmMessage: 'Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác và tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.',
    accountDeleted: 'Tài khoản đã được xóa!',
    
    // Footer
    saveAllSettings: 'Lưu tất cả cài đặt',
    settingsSaved: 'Đã lưu cài đặt!'
  },
  en: {
    // Header
    title: 'Settings',
    logout: 'Logout',
    
    // Sections
    account: 'Account',
    privacy: 'Privacy',
    notifications: 'Notifications',
    map: 'Map',
    appearance: 'Appearance',
    
    // Account Section
    accountInfo: 'Account Information',
    accountDescription: 'Manage your personal information',
    displayName: 'Display Name',
    displayNamePlaceholder: 'Enter display name',
    email: 'Email',
    emailCannotChange: 'Email cannot be changed',
    bio: 'Bio',
    bioPlaceholder: 'Write a few lines about yourself...',
    saveChanges: 'Save Changes',
    accountSaved: 'Account information saved!',
    
    // Privacy Section
    privacySettings: 'Privacy Settings',
    privacyDescription: 'Control who can view your content',
    defaultPrivacy: 'Default Privacy',
    defaultPrivacyDesc: 'Set default privacy for new memories',
    showLocation: 'Show Location',
    showLocationDesc: 'Allow location display on map',
    
    // Notifications Section
    notificationSettings: 'Notification Settings',
    notificationDescription: 'Manage how you receive notifications',
    emailNotifications: 'Email Notifications',
    emailNotificationsDesc: 'Receive important notifications via email',
    newMemoryNotifications: 'New Memory Notifications',
    newMemoryNotificationsDesc: 'Receive notifications when new memories are shared',
    shareNotifications: 'Share Notifications',
    shareNotificationsDesc: 'Receive notifications when someone shares a memory with you',
    
    // Map Section
    mapSettings: 'Map Settings',
    mapDescription: 'Customize your map experience',
    mapType: 'Map Type',
    mapTypeDesc: 'Choose the map type you want to display',
    autoZoom: 'Auto Zoom',
    autoZoomDesc: 'Automatically zoom when selecting a location',
    
    // Appearance Section
    appearanceSettings: 'Appearance Settings',
    appearanceDescription: 'Customize the app interface',
    theme: 'Theme',
    themeDesc: 'Choose light or dark mode',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
    languageDesc: 'Choose display language',
    
    // Security Section
    security: 'Security',
    securityDescription: 'Manage password and account security',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    currentPasswordPlaceholder: 'Enter current password',
    newPassword: 'New Password',
    newPasswordPlaceholder: 'Enter new password (minimum 8 characters)',
    confirmPassword: 'Confirm New Password',
    confirmPasswordPlaceholder: 'Re-enter new password',
    cancel: 'Cancel',
    savePassword: 'Save Password',
    passwordMismatch: 'New passwords do not match!',
    passwordTooShort: 'Password must be at least 8 characters!',
    passwordChanged: 'Password changed successfully!',
    dangerZone: 'Danger Zone',
    deleteAccount: 'Delete Account',
    deleteConfirmTitle: 'Confirm Account Deletion',
    deleteConfirmMessage: 'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
    accountDeleted: 'Account deleted!',
    
    // Footer
    saveAllSettings: 'Save All Settings',
    settingsSaved: 'Settings saved!'
  }
};

const DEFAULT_BIO = 'Lưu giữ những mảnh ghép của cuộc đời.';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, authChecked, updateDisplayName, updateProfileBio, updateShowLocationPref, updateDefaultPrivacyPref, updateMapTypePref } = useAuth();
  const { profile, updateProfile: updateProfileApi, uploadAvatar } = useProfile();
  const [activeSection, setActiveSection] = useState('account');
  
  // Account Settings
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState(DEFAULT_BIO);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const fileInputRef = useRef(null);
  
  // Privacy Settings
  const [defaultPrivacy, setDefaultPrivacy] = useState('public');
  const [showLocation, setShowLocation] = useState(true);
  
  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newMemoryNotifications, setNewMemoryNotifications] = useState(true);
  const [shareNotifications, setShareNotifications] = useState(true);
  
  // Map Settings
  const [mapType, setMapType] = useState('roadmap');
  const [autoZoom, setAutoZoom] = useState(true);
  
  // Appearance Settings
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('vi');
  
  // Password Change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Delete Account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  

  const loadUserData = useCallback(() => {
    try {
      if (user) {
        const userEmail = user.email || user.attributes?.email || user.username || '';
        setEmail(userEmail);
        // Luôn lấy từ displayName đã chuẩn hóa trong AuthContext, fallback sang username/email khi cần
        const preferredName =
          user.displayName ||
          user.username ||
          (userEmail ? userEmail.split('@')[0] : '');
        setDisplayName(preferredName || '');
        const initialBio = user.bio || DEFAULT_BIO;
        setBio(initialBio);
        const initialShowLocation = user.showLocationPref ?? true;
        setShowLocation(initialShowLocation);
        const initialDefaultPrivacy = user.defaultPrivacyPref || 'public';
        setDefaultPrivacy(initialDefaultPrivacy);
        const initialMapType = user.mapTypePref || 'roadmap';
        setMapType(initialMapType);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, [user]);

  // Khi profile từ API sẵn sàng, override lại tên / bio / avatar từ backend
  useEffect(() => {
    if (profile) {
      if (profile.username) {
        setDisplayName(profile.username);
      }
      if (profile.bio !== undefined) {
        setBio(profile.bio || DEFAULT_BIO);
      }
      if (profile.avatarUrl) {
        setAvatarUrl(profile.avatarUrl);
      }
    }
  }, [profile]);

  // Chỉ redirect khi đã check auth xong xuôi mà vẫn không có user
  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      navigate('/auth?mode=login');
      return;
    }
    
    // Load user data
    if (authChecked && isAuthenticated) {
      loadUserData();
    }
  }, [authChecked, isAuthenticated, navigate, loadUserData]);

  // Get translations based on language
  const t = translations[language] || translations.vi;

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      alert(t.passwordMismatch);
      return;
    }
    if (newPassword.length < 8) {
      alert(t.passwordTooShort);
      return;
    }
    // TODO: Implement password change
    console.log('Changing password');
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSaveSettings = async () => {
    try {
      // Gọi API backend để lưu profile (username + bio)
      await updateProfileApi({
        username: displayName,
        bio,
      });

      // Cập nhật lại context để đồng bộ tên hiển thị / bio trong app
      updateDisplayName(displayName);
      updateProfileBio(bio);
    } catch (error) {
      console.error('Error saving account settings:', error);
      alert(error.message || 'Không thể lưu thông tin tài khoản');
    }
  };

  const handleDeleteAccount = () => {
    // TODO: Implement delete account
    console.log('Deleting account');
    alert(t.accountDeleted);
    logout();
  };

  const handleLogout = () => {
    logout();
  };

  const handleSectionChange = (sectionId) => {
    if (sectionId === activeSection) return;
    setActiveSection(sectionId);
  };

  const settingsSections = [
    { id: 'account', label: t.account, icon: User },
    { id: 'privacy', label: t.privacy, icon: Shield },
    { id: 'notifications', label: t.notifications, icon: Bell },
    { id: 'map', label: t.map, icon: MapIcon },
    { id: 'appearance', label: t.appearance, icon: Palette }
  ];

  const renderAccountSection = () => (
    <div className={`settings-section section-content section-entering`}>
      <div className="section-header">
        <h2>{t.accountInfo}</h2>
        <p className="section-description">{t.accountDescription}</p>
      </div>

      <div className="settings-content">
        <div className="avatar-section">
          <div className="avatar-container">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="settings-avatar-img"
              />
            ) : (
              <div className="avatar-placeholder">
                {(displayName || user?.displayName || user?.username || user?.email)?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const res = await uploadAvatar(file);
                  const updated = res?.profile || res;
                  if (updated?.avatarUrl) {
                    setAvatarUrl(updated.avatarUrl);
                  }
                } catch (err) {
                  console.error('Upload avatar error:', err);
                  alert(err.message || 'Không thể upload avatar');
                } finally {
                  // Cho phép chọn lại cùng một file nếu cần
                  e.target.value = '';
                }
              }}
            />
            <button
              type="button"
              className="avatar-edit-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="displayName">{t.displayName}</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t.displayNamePlaceholder}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">
            <Mail className="w-4 h-4" />
            {t.email}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled
          />
          <span className="input-hint">{t.emailCannotChange}</span>
        </div>

        <div className="form-group">
          <label htmlFor="bio">{t.bio}</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={DEFAULT_BIO}
            rows={4}
          />
        </div>

      </div>

      {/* Khối bảo mật được gộp chung trong phần Tài khoản */}
      <div className="settings-content">
        <div className="section-subheader">
          <h2>{t.security}</h2>
          <p className="section-description">{t.securityDescription}</p>
        </div>

        {!showPasswordForm ? (
          <button
            className="action-btn"
            onClick={() => setShowPasswordForm(true)}
          >
            <Lock className="w-4 h-4" />
            {t.changePassword}
          </button>
        ) : (
          <div className="password-form">
            <div className="form-group">
              <label htmlFor="currentPassword">{t.currentPassword}</label>
              <div className="password-input-wrapper">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t.currentPasswordPlaceholder}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">{t.newPassword}</label>
              <div className="password-input-wrapper">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.newPasswordPlaceholder}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">{t.confirmPassword}</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.confirmPasswordPlaceholder}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="form-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                {t.cancel}
              </button>
              <button className="save-btn" onClick={handleChangePassword}>
                <Save className="w-4 h-4" />
                {t.savePassword}
              </button>
            </div>
          </div>
        )}

        <div className="danger-zone">
          <h3>{t.dangerZone}</h3>
          <div className="danger-actions">
            <button
              className="danger-btn"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
              {t.deleteAccount}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacySection = () => (
    <div className={`settings-section section-content section-entering`}>
      <div className="section-header">
        <h2>{t.privacySettings}</h2>
        <p className="section-description">{t.privacyDescription}</p>
      </div>

      <div className="settings-content">
        <div className="setting-item">
          <div className="setting-info">
            <h3>{t.defaultPrivacy}</h3>
            <p>{t.defaultPrivacyDesc}</p>
          </div>
          <div className="setting-control">
            <PrivacyDropdown
              value={defaultPrivacy}
              language={language}
              onChange={(val) => {
                setDefaultPrivacy(val);
                updateDefaultPrivacyPref(val);
              }}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>{t.showLocation}</h3>
            <p>{t.showLocationDesc}</p>
          </div>
          <div className="setting-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showLocation}
                onChange={(e) => {
                  const nextValue = e.target.checked;
                  setShowLocation(nextValue);
                  updateShowLocationPref(nextValue);
                }}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className={`settings-section section-content section-entering`}>
      <div className="section-header">
        <h2>{t.notificationSettings}</h2>
        <p className="section-description">{t.notificationDescription}</p>
      </div>

      <div className="settings-content">
        <div className="setting-item">
          <div className="setting-info">
            <h3>{t.emailNotifications}</h3>
            <p>{t.emailNotificationsDesc}</p>
          </div>
          <div className="setting-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>{t.newMemoryNotifications}</h3>
            <p>{t.newMemoryNotificationsDesc}</p>
          </div>
          <div className="setting-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={newMemoryNotifications}
                onChange={(e) => setNewMemoryNotifications(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>{t.shareNotifications}</h3>
            <p>{t.shareNotificationsDesc}</p>
          </div>
          <div className="setting-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={shareNotifications}
                onChange={(e) => setShareNotifications(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMapSection = () => (
    <div className={`settings-section section-content section-entering`}>
      <div className="section-header">
        <h2>{t.mapSettings}</h2>
        <p className="section-description">{t.mapDescription}</p>
      </div>

      <div className="settings-content">
        <div className="setting-item">
          <div className="setting-info">
            <h3>{t.mapType}</h3>
            <p>{t.mapTypeDesc}</p>
          </div>
          <div className="setting-control">
            <MapTypeDropdown
              value={mapType}
              language={language}
              onChange={(val) => {
                setMapType(val);
                updateMapTypePref(val);
              }}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>{t.autoZoom}</h3>
            <p>{t.autoZoomDesc}</p>
          </div>
          <div className="setting-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={autoZoom}
                onChange={(e) => setAutoZoom(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className={`settings-section section-content section-entering`}>
      <div className="section-header">
        <h2>{t.appearanceSettings}</h2>
        <p className="section-description">{t.appearanceDescription}</p>
      </div>

      <div className="settings-content">
        <div className="setting-item">
          <div className="setting-info">
            <h3>{t.theme}</h3>
            <p>{t.themeDesc}</p>
          </div>
          <div className="setting-control">
            <div className="theme-selector">
              <button
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun className="w-5 h-5" />
                <span>{t.light}</span>
              </button>
              <button
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon className="w-5 h-5" />
                <span>{t.dark}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>{t.language}</h3>
            <p>{t.languageDesc}</p>
          </div>
          <div className="setting-control">
            <LanguageDropdown
              value={language}
              onChange={setLanguage}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`settings-page ${theme === 'dark' ? 'dark-mode' : ''}`}>
      <header className="settings-header">
        <div className="header-content">
          <BackButton onClick={() => navigate('/personal')} />
          <h1>{t.title}</h1>
        </div>
      </header>

      <div className="settings-container">
        <aside className="settings-sidebar">
          <nav className="settings-nav">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => handleSectionChange(section.id)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <button className="save-all-btn" onClick={handleSaveSettings}>
              <Save className="w-4 h-4" />
              {t.saveAllSettings}
            </button>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              {t.logout}
            </button>
          </div>
        </aside>

        <main className="settings-main">
          {activeSection === 'account' && (
            <div key="account">{renderAccountSection()}</div>
          )}
          {activeSection === 'privacy' && (
            <div key="privacy">{renderPrivacySection()}</div>
          )}
          {activeSection === 'notifications' && (
            <div key="notifications">{renderNotificationsSection()}</div>
          )}
          {activeSection === 'map' && (
            <div key="map">{renderMapSection()}</div>
          )}
          {activeSection === 'appearance' && (
            <div key="appearance">{renderAppearanceSection()}</div>
          )}
        </main>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t.deleteConfirmTitle}</h3>
            <p>{t.deleteConfirmMessage}</p>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t.cancel}
              </button>
              <button
                className="danger-btn"
                onClick={handleDeleteAccount}
              >
                <Trash2 className="w-4 h-4" />
                {t.deleteAccount}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

