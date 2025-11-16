import React, { useState, useEffect } from 'react';
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
import { isAuthenticated, signOut, getCurrentUser } from '../../services/cognito';
import BackButton from './components/BackButton';
import PrivacyDropdown from './components/PrivacyDropdown';
import LanguageDropdown from './components/LanguageDropdown';
import MapTypeDropdown from './components/MapTypeDropdown';
import MapUnitDropdown from './components/MapUnitDropdown';
import './SettingsPage.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('account');
  
  // Account Settings
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  
  // Privacy Settings
  const [defaultPrivacy, setDefaultPrivacy] = useState('public');
  const [showLocation, setShowLocation] = useState(true);
  const [allowSharing, setAllowSharing] = useState(true);
  
  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newMemoryNotifications, setNewMemoryNotifications] = useState(true);
  const [shareNotifications, setShareNotifications] = useState(true);
  
  // Map Settings
  const [mapType, setMapType] = useState('roadmap');
  const [mapUnit, setMapUnit] = useState('metric');
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
  

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth?mode=login');
      return;
    }
    
    // Load user data
    loadUserData();
  }, [navigate]);

  const loadUserData = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const userEmail = currentUser.attributes?.email || currentUser.username || '';
        setEmail(userEmail);
        setDisplayName(currentUser.attributes?.name || userEmail.split('@')[0] || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSaveAccount = () => {
    // TODO: Implement save account settings
    console.log('Saving account settings:', { displayName, email, bio });
    alert('Đã lưu thông tin tài khoản!');
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      alert('Mật khẩu mới không khớp!');
      return;
    }
    if (newPassword.length < 8) {
      alert('Mật khẩu phải có ít nhất 8 ký tự!');
      return;
    }
    // TODO: Implement password change
    console.log('Changing password');
    alert('Đã đổi mật khẩu thành công!');
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSaveSettings = () => {
    // TODO: Implement save all settings
    console.log('Saving settings:', {
      privacy: { defaultPrivacy, showLocation, allowSharing },
      notifications: { emailNotifications, newMemoryNotifications, shareNotifications },
      map: { mapType, mapUnit, autoZoom },
      appearance: { theme, language }
    });
    alert('Đã lưu cài đặt!');
  };

  const handleDeleteAccount = () => {
    // TODO: Implement delete account
    console.log('Deleting account');
    alert('Tài khoản đã được xóa!');
    signOut();
    navigate('/');
  };

  const handleLogout = () => {
    signOut();
    navigate('/');
  };

  const handleSectionChange = (sectionId) => {
    if (sectionId === activeSection) return;
    setActiveSection(sectionId);
  };

  const settingsSections = [
    { id: 'account', label: 'Tài khoản', icon: User },
    { id: 'privacy', label: 'Quyền riêng tư', icon: Shield },
    { id: 'notifications', label: 'Thông báo', icon: Bell },
    { id: 'map', label: 'Bản đồ', icon: MapIcon },
    { id: 'appearance', label: 'Giao diện', icon: Palette },
    { id: 'security', label: 'Bảo mật', icon: Lock }
  ];

  const renderAccountSection = () => (
    <div className={`settings-section section-content section-entering`}>
      <div className="section-header">
        <h2>Thông tin tài khoản</h2>
        <p className="section-description">Quản lý thông tin cá nhân của bạn</p>
      </div>

      <div className="settings-content">
        <div className="avatar-section">
          <div className="avatar-container">
            <div className="avatar-placeholder">
              <User className="w-12 h-12" />
            </div>
            <button className="avatar-edit-btn">
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="displayName">Tên hiển thị</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Nhập tên hiển thị"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">
            <Mail className="w-4 h-4" />
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled
          />
          <span className="input-hint">Email không thể thay đổi</span>
        </div>

        <div className="form-group">
          <label htmlFor="bio">Giới thiệu</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Viết vài dòng giới thiệu về bản thân..."
            rows={4}
          />
        </div>

        <button className="save-btn" onClick={handleSaveAccount}>
          <Save className="w-4 h-4" />
          Lưu thay đổi
        </button>
      </div>
    </div>
  );

  const renderPrivacySection = () => (
    <div className={`settings-section section-content section-entering`}>
      <div className="section-header">
        <h2>Cài đặt quyền riêng tư</h2>
        <p className="section-description">Kiểm soát ai có thể xem nội dung của bạn</p>
      </div>

      <div className="settings-content">
        <div className="setting-item">
          <div className="setting-info">
            <h3>Quyền riêng tư mặc định</h3>
            <p>Thiết lập quyền riêng tư mặc định cho các ký ức mới</p>
          </div>
          <div className="setting-control">
            <PrivacyDropdown
              value={defaultPrivacy}
              onChange={setDefaultPrivacy}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Hiển thị vị trí</h3>
            <p>Cho phép hiển thị vị trí trên bản đồ</p>
          </div>
          <div className="setting-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showLocation}
                onChange={(e) => setShowLocation(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Cho phép chia sẻ</h3>
            <p>Cho phép người khác chia sẻ ký ức của bạn</p>
          </div>
          <div className="setting-control">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={allowSharing}
                onChange={(e) => setAllowSharing(e.target.checked)}
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
        <h2>Cài đặt thông báo</h2>
        <p className="section-description">Quản lý cách bạn nhận thông báo</p>
      </div>

      <div className="settings-content">
        <div className="setting-item">
          <div className="setting-info">
            <h3>Thông báo qua email</h3>
            <p>Nhận thông báo quan trọng qua email</p>
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
            <h3>Thông báo ký ức mới</h3>
            <p>Nhận thông báo khi có ký ức mới được chia sẻ</p>
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
            <h3>Thông báo chia sẻ</h3>
            <p>Nhận thông báo khi ai đó chia sẻ ký ức với bạn</p>
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
        <h2>Cài đặt bản đồ</h2>
        <p className="section-description">Tùy chỉnh trải nghiệm bản đồ của bạn</p>
      </div>

      <div className="settings-content">
        <div className="setting-item">
          <div className="setting-info">
            <h3>Loại bản đồ</h3>
            <p>Chọn loại bản đồ bạn muốn hiển thị</p>
          </div>
          <div className="setting-control">
            <MapTypeDropdown
              value={mapType}
              onChange={setMapType}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Đơn vị đo lường</h3>
            <p>Chọn đơn vị đo lường cho khoảng cách</p>
          </div>
          <div className="setting-control">
            <MapUnitDropdown
              value={mapUnit}
              onChange={setMapUnit}
            />
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Tự động phóng to</h3>
            <p>Tự động phóng to khi chọn địa điểm</p>
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
        <h2>Cài đặt giao diện</h2>
        <p className="section-description">Tùy chỉnh giao diện ứng dụng</p>
      </div>

      <div className="settings-content">
        <div className="setting-item">
          <div className="setting-info">
            <h3>Giao diện</h3>
            <p>Chọn chế độ sáng hoặc tối</p>
          </div>
          <div className="setting-control">
            <div className="theme-selector">
              <button
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun className="w-5 h-5" />
                <span>Sáng</span>
              </button>
              <button
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon className="w-5 h-5" />
                <span>Tối</span>
              </button>
            </div>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>Ngôn ngữ</h3>
            <p>Chọn ngôn ngữ hiển thị</p>
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

  const renderSecuritySection = () => (
    <div className={`settings-section section-content section-entering`}>
      <div className="section-header">
        <h2>Bảo mật</h2>
        <p className="section-description">Quản lý mật khẩu và bảo mật tài khoản</p>
      </div>

      <div className="settings-content">
        {!showPasswordForm ? (
          <button
            className="action-btn"
            onClick={() => setShowPasswordForm(true)}
          >
            <Lock className="w-4 h-4" />
            Đổi mật khẩu
          </button>
        ) : (
          <div className="password-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Mật khẩu hiện tại</label>
              <div className="password-input-wrapper">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
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
              <label htmlFor="newPassword">Mật khẩu mới</label>
              <div className="password-input-wrapper">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
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
              <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
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
                Hủy
              </button>
              <button className="save-btn" onClick={handleChangePassword}>
                <Save className="w-4 h-4" />
                Lưu mật khẩu
              </button>
            </div>
          </div>
        )}

        <div className="danger-zone">
          <h3>Vùng nguy hiểm</h3>
          <div className="danger-actions">
            <button
              className="danger-btn"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
              Xóa tài khoản
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div className="header-content">
          <BackButton onClick={() => navigate('/home')} />
          <h1>Cài đặt</h1>
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
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Đăng xuất
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
          {activeSection === 'security' && (
            <div key="security">{renderSecuritySection()}</div>
          )}

          {activeSection !== 'security' && (
            <div className="settings-footer">
              <button className="save-all-btn" onClick={handleSaveSettings}>
                <Save className="w-4 h-4" />
                Lưu tất cả cài đặt
              </button>
            </div>
          )}
        </main>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Xác nhận xóa tài khoản</h3>
            <p>Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác và tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.</p>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Hủy
              </button>
              <button
                className="danger-btn"
                onClick={handleDeleteAccount}
              >
                <Trash2 className="w-4 h-4" />
                Xóa tài khoản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

